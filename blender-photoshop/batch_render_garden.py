import bpy
import os
import random
import time

# -----------------------------------------------------
# Configuration
# -----------------------------------------------------

max_images = None  # set to an int to limit images
dry_run = False  # True = no render, just write dry-run plan
validate_output = True  # only overwrite if render output looks valid
min_output_bytes = 2048  # minimum file size to consider a render non-empty

# Directory of this .blend file
base_dir = os.path.dirname(bpy.data.filepath)

# If the .blend file isn't saved yet
if not base_dir:
    raise RuntimeError("Please save the .blend file so paths can resolve.")

# Root of repo = parent of /public
repo_root = os.path.abspath(os.path.join(base_dir, ".."))

# Node trees to use per job (adjust to your actual mapping)
NODE_TREES_BY_SCENE = {
    "meadow-flowers": "Compositing Nodetree.001",
    "meadow-background": "Compositing Nodetree.002",
    "forest-flowers": "Compositing Nodetree.003",
    "forest-background": "Compositing Nodetree.004",
    # "<other-scene>": "Compositing Nodetree.005",
}

DEFAULT_IMAGE_NODE_NAME = "Image"
DEFAULT_GLARE_NODE_NAME = "Glare"

# -----------------------------------------------------
# Jobs: read AND write to public/garden
# -----------------------------------------------------

GARDEN_ROOT = os.path.join(repo_root, "public", "garden")

jobs = [
    {
        "scene": "meadow-flowers",
        "import_base": os.path.join(GARDEN_ROOT, "meadow_foreground"),
        "export_base": os.path.join(GARDEN_ROOT, "meadow_foreground"),
    },
    {
        "scene": "meadow-background",
        "import_base": os.path.join(GARDEN_ROOT, "meadow_background"),
        "export_base": os.path.join(GARDEN_ROOT, "meadow_background"),
        "subfolder_mapping": {
            "hills_far": "far_hills",
        },
    },
    {
        "scene": "forest-flowers",
        "import_base": os.path.join(GARDEN_ROOT, "forest_foreground"),
        "export_base": os.path.join(GARDEN_ROOT, "forest_foreground"),
    },
    {
        "scene": "forest-background",
        "import_base": os.path.join(GARDEN_ROOT, "forest_background"),
        "export_base": os.path.join(GARDEN_ROOT, "forest_background"),
    },
    # Biomes: process forest background + foreground, skip sky
    {
        "scene": "forest-background",
        "import_base": os.path.join(GARDEN_ROOT, "biomes", "forest", "background"),
        "export_base": os.path.join(GARDEN_ROOT, "biomes", "forest", "background"),
        "subfolder_mapping": {
            "hills_far": "far_hills",
        },
        "skip_subfolders": {"sky"},
    },
    {
        "scene": "forest-flowers",
        "import_base": os.path.join(GARDEN_ROOT, "biomes", "forest", "foreground"),
        "export_base": os.path.join(GARDEN_ROOT, "biomes", "forest", "foreground"),
    },
]

dry_run_file = os.path.join(base_dir, "dry-run.txt")
log_file = os.path.join(base_dir, "batch-render.log")

# -----------------------------------------------------
# Helpers
# -----------------------------------------------------

def log(msg):
    stamp = time.strftime("[%H:%M:%S]")
    line = f"{stamp} {msg}"
    print(line)
    try:
        with open(log_file, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def randomize_nodes(glare_node):
    if not glare_node:
        return
    try:
        glare_node.inputs["Streaks"].default_value = random.randint(4, 6)
        glare_node.inputs["Streaks Angle"].default_value = random.uniform(0, 90)
    except Exception:
        pass


def find_node_by_type_or_name(node_tree, node_type=None, name=None):
    if not node_tree:
        return None

    if name:
        n = node_tree.nodes.get(name)
        if n:
            return n

    if node_type:
        for n in node_tree.nodes:
            if n.bl_idname == node_type:
                return n

    return None


def find_image_node(node_tree, preferred_name):
    if not node_tree:
        return None
    node = find_node_by_type_or_name(
        node_tree, node_type="CompositorNodeImage", name=preferred_name
    )
    if node:
        return node
    for n in node_tree.nodes:
        if n.bl_idname == "CompositorNodeImage":
            log(f"WARN: Using fallback image node '{n.name}'")
            return n
    return None


def find_glare_node(node_tree, preferred_name):
    if not node_tree:
        return None
    node = find_node_by_type_or_name(
        node_tree, node_type="CompositorNodeGlare", name=preferred_name
    )
    if node:
        return node
    for n in node_tree.nodes:
        if n.bl_idname == "CompositorNodeGlare":
            log(f"WARN: Using fallback glare node '{n.name}'")
            return n
    return None


def collect_subfolders(path):
    if not os.path.isdir(path):
        return []
    items = [
        os.path.join(path, d)
        for d in os.listdir(path)
        if os.path.isdir(os.path.join(path, d))
    ]
    return sorted([os.path.abspath(p) for p in items])


def resolve_node_tree(scene_name, scene):
    desired = NODE_TREES_BY_SCENE.get(scene_name)
    if desired:
        tree = bpy.data.node_groups.get(desired)
        if tree:
            return tree
        log(f"WARN: Node tree '{desired}' not found for scene '{scene_name}'.")

    tree = getattr(scene, "node_tree", None)
    if tree:
        return tree

    return None


def summarize_tree(tree):
    if not tree:
        return "(none)"
    names = [n.name for n in tree.nodes]
    return f"{tree.name} nodes={len(names)} sample={names[:6]}"


def output_seems_valid(path):
    if not os.path.exists(path):
        return False, "missing"
    size = os.path.getsize(path)
    if size < min_output_bytes:
        return False, f"too_small({size}b)"
    try:
        img = bpy.data.images.load(path)
        pixels = img.pixels
        step = max(1, int(len(pixels) / 2000))
        nonzero = False
        for i in range(0, len(pixels), step * 4):
            if pixels[i] > 0.01 or pixels[i + 1] > 0.01 or pixels[i + 2] > 0.01:
                nonzero = True
                break
        bpy.data.images.remove(img)
        if not nonzero:
            return False, "all_black_sample"
    except Exception as e:
        return False, f"inspect_error({e})"
    return True, "ok"

# -----------------------------------------------------
# Batch process
# -----------------------------------------------------

log("=== Batch processing start ===")
log(f"Blend: {bpy.data.filepath}")
log(f"Repo root: {repo_root}")
log(f"Dry run: {dry_run}")
log(f"Node trees available: {[ng.name for ng in bpy.data.node_groups]}")

planned_ops = []

for job in jobs:
    import_base = job["import_base"]
    export_base = job["export_base"]
    scene_name = job["scene"]
    subfolder_mapping = job.get("subfolder_mapping", {})
    skip_subfolders = {s.lower() for s in job.get("skip_subfolders", set())}

    if not os.path.isdir(import_base):
        log(f"WARN: import_base missing: {import_base} (job: {scene_name})")
        continue

    subfolders = collect_subfolders(import_base)
    if not subfolders:
        planned_ops.append(f"No subfolders found in {import_base} (job: {scene_name})")
        log(f"WARN: No subfolders in {import_base} (job: {scene_name})")
        continue

    for subfolder in subfolders:
        sub_name = os.path.basename(subfolder)
        if sub_name.lower() in skip_subfolders:
            log(f"SKIP: subfolder '{sub_name}' in job '{scene_name}'")
            continue
        output_sub_name = subfolder_mapping.get(sub_name, sub_name)
        target_dir = os.path.join(export_base, output_sub_name)
        os.makedirs(target_dir, exist_ok=True)

        image_files = sorted(
            f
            for f in os.listdir(subfolder)
            if f.lower().endswith((".png", ".jpg", ".jpeg"))
        )
        if max_images is not None:
            image_files = image_files[:max_images]

        if not image_files:
            planned_ops.append(f"No images in {subfolder} (job: {scene_name})")
            log(f"WARN: No images in {subfolder} (job: {scene_name})")
            continue

        for file_name in image_files:
            input_path = os.path.join(subfolder, file_name)
            output_path = os.path.join(target_dir, file_name)

            planned_ops.append(f"Job={scene_name}")
            planned_ops.append(f"In={input_path}")
            planned_ops.append(f"Out={output_path}")
            planned_ops.append("")

            is_far_hills = output_sub_name.lower() == "far_hills"
            res_x, res_y = (2048, 1024) if is_far_hills else (1080, 1080)

            if dry_run:
                continue

            scene = bpy.data.scenes.get(scene_name)
            if not scene:
                log(f"ERROR: Scene '{scene_name}' not found; skipping {input_path}")
                continue

            try:
                try:
                    bpy.context.window.scene = scene
                except Exception:
                    bpy.context.scene = scene

                scene.render.resolution_x = res_x
                scene.render.resolution_y = res_y
                scene.render.resolution_percentage = 100

                node_tree = resolve_node_tree(scene_name, scene)
                if not node_tree:
                    log(
                        f"ERROR: No compositor node tree for scene '{scene_name}'. "
                        f"Check NODE_TREES_BY_SCENE."
                    )
                    continue

                img_node = find_image_node(node_tree, DEFAULT_IMAGE_NODE_NAME)
                glare_node = find_glare_node(node_tree, DEFAULT_GLARE_NODE_NAME)

                if not img_node:
                    log(
                        f"ERROR: No Image node in '{node_tree.name}' for scene '{scene_name}'. "
                        f"Tree info: {summarize_tree(node_tree)}"
                    )
                    continue

                img = bpy.data.images.load(input_path)
                img_node.image = img

                randomize_nodes(glare_node)

                scene.render.image_settings.file_format = "PNG"
                scene.render.image_settings.color_mode = "RGBA"
                scene.render.image_settings.color_depth = "8"
                scene.render.use_overwrite = True
                scene.use_nodes = True
                scene.render.use_compositing = True

                tmp_output = output_path + ".tmp.png"
                scene.render.filepath = tmp_output

                bpy.ops.render.render(write_still=True)

                if os.path.exists(tmp_output):
                    if validate_output:
                        ok, reason = output_seems_valid(tmp_output)
                        if not ok:
                            log(
                                f"WARN: Render output rejected ({reason}) for {input_path}. "
                                f"Keeping original."
                            )
                            try:
                                os.remove(tmp_output)
                            except Exception:
                                pass
                        else:
                            os.replace(tmp_output, output_path)
                    else:
                        os.replace(tmp_output, output_path)
                else:
                    log(f"WARN: Temp output missing: {tmp_output}")

                bpy.data.images.remove(img)

                log(
                    f"Rendered {input_path} -> {output_path} using scene '{scene_name}' "
                    f"tree '{node_tree.name}'"
                )

            except Exception as e:
                log(f"ERROR: {input_path}: {e}")

# -----------------------------------------------------
# Dry run output
# -----------------------------------------------------

if dry_run:
    with open(dry_run_file, "w", encoding="utf-8") as fh:
        for line in planned_ops:
            fh.write(line + "\n")
    log(f"Dry-run enabled. Plan written to: {dry_run_file}")
else:
    log("✅ Batch processing complete!")
