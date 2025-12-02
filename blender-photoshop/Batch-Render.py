import bpy
import os
import random
import math

# -----------------------------------------------------
# Configuration
# -----------------------------------------------------

# Limit number of images to process (set to None to disable)
max_images = None  # e.g., process only 5 images

base_dir = os.path.dirname(bpy.data.filepath)

# Get all subfolders of meadow_foreground
import_base = os.path.join(base_dir, "flower_imports", "meadow_foreground")
export_base = os.path.join(base_dir, "..", "public", "garden", "meadow_foreground")

# Discover all subfolders
import_folders = [
    os.path.join(import_base, subfolder)
    for subfolder in os.listdir(import_base)
    if os.path.isdir(os.path.join(import_base, subfolder))
]

export_folders = [
    os.path.join(export_base, os.path.basename(imp_folder))
    for imp_folder in import_folders
]

import_folders = sorted([os.path.abspath(f) for f in import_folders])
export_folders = sorted([os.path.abspath(f) for f in export_folders])

# Access compositor node tree
tree = bpy.data.node_groups["Compositing Nodetree.002"]

# Get nodes by name
img_node = tree.nodes.get("Image")
blur1 = tree.nodes.get("Directional Blur")
noise = tree.nodes.get("Noise Texture.001")
blur2 = tree.nodes.get("Directional Blur.002")
glare = tree.nodes.get("Glare")

# -----------------------------------------------------
# Helper: Randomize parameters
# -----------------------------------------------------
def randomize_nodes():
    # Directional Blur 1
    blur1.inputs["Direction"].default_value = random.uniform(0, 90)

    # Noise Texture
    noise.inputs["Scale"].default_value = random.uniform(1, 5)

    # Value node (used to drive the Displace strength)
    value_node = tree.nodes.get("Value")
    value_node.outputs[0].default_value = random.uniform(25, 100)

    # Directional Blur 2
    blur2.inputs["Rotation"].default_value = math.radians(random.uniform(-4, 4))
    blur2.inputs["Direction"].default_value = random.uniform(0, 90)
    
    # Glare
    glare.inputs["Streaks"].default_value = random.randint(4, 6)
    glare.inputs["Streaks Angle"].default_value = random.uniform(0, 90)

# -----------------------------------------------------
# Batch process images
# -----------------------------------------------------
for import_dir, export_dir in zip(import_folders, export_folders):
    os.makedirs(export_dir, exist_ok=True)

    image_files = sorted([
        f for f in os.listdir(import_dir)
        if f.lower().endswith((".png", ".jpg", ".jpeg"))
    ])

    if max_images is not None:
        image_files = image_files[:max_images]

    for i, file_name in enumerate(image_files, start=1):
        img_path = os.path.join(import_dir, file_name)
        output_path = os.path.join(export_dir, file_name)

        img = bpy.data.images.load(img_path)
        img_node.image = img

        randomize_nodes()

        bpy.context.scene.render.filepath = output_path
        bpy.ops.render.render(write_still=True)

        bpy.data.images.remove(img)

        print(f"Rendered {file_name} from {import_dir} to {export_dir}")


print("✅ Batch processing complete!")
