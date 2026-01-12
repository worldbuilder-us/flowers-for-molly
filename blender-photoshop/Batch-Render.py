import bpy
import os
import random
import sys

# -----------------------------------------------------
# Configuration
# -----------------------------------------------------

# Limit number of images to process (set to None to disable)
max_images = None  # e.g., process only 5 images

# Dry-run mode: when True, no renders are executed; planned operations are written to `dry-run.txt`.
dry_run = True

# Base directory (derived from blend file location)
base_dir = os.path.dirname(bpy.data.filepath)
if not base_dir:
    # fallback to the known path if blend hasn't been saved in this environment
    base_dir = r"C:\Users\Conor\Documents\flowers-for-molly\blender-photoshop"

# Jobs: each job maps a scene name to an import base and export base.
# Adjusted per user's description.
jobs = [
    {
        "scene": "meadow-flowers",
        "import_base": os.path.join(base_dir, "flower_imports", "meadow_foreground"),
        "export_base": os.path.join(base_dir, "..", "public", "garden", "meadow_foreground"),
    },
    {
        "scene": "meadow-background",
        "import_base": os.path.join(base_dir, "landscape_imports", "forest"),
        "export_base": os.path.join(base_dir, "..", "public", "garden", "meadow_background"),
    },
    {
        "scene": "forest-flowers",
        "import_base": os.path.join(base_dir, "flower_imports", "forest_foreground"),
        "export_base": os.path.join(base_dir, "..", "public", "garden", "forest_foreground"),
    },
    {
        "scene": "forest-background",
        "import_base": os.path.join(base_dir, "landscape_imports", "forest"),
        "export_base": os.path.join(base_dir, "..", "public", "garden", "forest_background"),
    },
]

# Where to write the dry-run plan
dry_run_file = os.path.join(base_dir, "dry-run.txt")


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


def collect_subfolders(path):
    if not os.path.isdir(path):
        return []
    items = [os.path.join(path, d) for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
    return sorted([os.path.abspath(p) for p in items])


planned_ops = []

for job in jobs:
    import_base = job["import_base"]
    export_base = job["export_base"]
    scene_name = job["scene"]

    subfolders = collect_subfolders(import_base)
    if not subfolders:
        planned_ops.append(f"No subfolders found in {import_base} (job: {scene_name})")
        continue

    for subfolder in subfolders:
        sub_name = os.path.basename(subfolder)
        target_dir = os.path.join(export_base, sub_name)
        os.makedirs(target_dir, exist_ok=True)

        image_files = sorted([f for f in os.listdir(subfolder) if f.lower().endswith((".png", ".jpg", ".jpeg"))])
        if max_images is not None:
            image_files = image_files[:max_images]

        if not image_files:
            planned_ops.append(f"No images in {subfolder} (job: {scene_name})")
            continue

        for file_name in image_files:
            input_path = os.path.join(subfolder, file_name)
            output_path = os.path.join(target_dir, file_name)

            planned_ops.append(f"Job={scene_name}")
            planned_ops.append(f"In={input_path}")
            planned_ops.append(f"Out={output_path}")
            planned_ops.append("")

            if dry_run:
                continue

            # Switch to the job's scene
            scene = bpy.data.scenes.get(scene_name)
            if not scene:
                print(f"Scene '{scene_name}' not found; skipping {input_path}")
                continue

            try:
                # attempt to set the context scene if possible
                try:
                    bpy.context.window.scene = scene
                except Exception:
                    bpy.context.scene = scene

                node_tree = getattr(scene, "node_tree", None)

                # Find image node and glare node (fall back to type-based lookup)
                img_node = find_node_by_type_or_name(node_tree, node_type="CompositorNodeImage", name="Image")
                glare_node = find_node_by_type_or_name(node_tree, node_type="CompositorNodeGlare", name="Glare")

                if not img_node:
                    print(f"No image node found in scene '{scene_name}'; skipping {input_path}")
                    continue

                img = bpy.data.images.load(input_path)
                img_node.image = img

                randomize_nodes(glare_node)

                scene.render.filepath = output_path
                bpy.ops.render.render(write_still=True)

                bpy.data.images.remove(img)

                print(f"Rendered {input_path} -> {output_path} using scene '{scene_name}'")
            except Exception as e:
                print(f"Error rendering {input_path}: {e}")


# Write dry-run output if enabled
if dry_run:
    try:
        with open(dry_run_file, "w", encoding="utf-8") as fh:
            for line in planned_ops:
                fh.write(line + "\n")
        print(f"Dry-run enabled. Plan written to: {dry_run_file}")
    except Exception as e:
        print(f"Failed to write dry-run file: {e}")
else:
    print("✅ Batch processing complete!")

