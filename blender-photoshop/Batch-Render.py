import bpy
import os
import random
import math

# -----------------------------------------------------
# Configuration
# -----------------------------------------------------
blend_dir = os.path.dirname(bpy.data.filepath)
input_folder = os.path.join(blend_dir, "flower_imports")
output_folder = os.path.join(blend_dir, "flower_exports")

# Limit number of images to process (set to None to disable)
max_images = None  # e.g., process only 5 images

# Ensure output folder exists
os.makedirs(output_folder, exist_ok=True)

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
    value_node.outputs[0].default_value = random.uniform(50, 150)

    # Directional Blur 2
    blur2.inputs["Rotation"].default_value = math.radians(random.uniform(-4, 4))
    blur2.inputs["Direction"].default_value = random.uniform(0, 90)
    
    # Glare
    glare.inputs["Streaks"].default_value = random.randint(4, 6)
    glare.inputs["Streaks Angle"].default_value = random.uniform(0, 90)

# -----------------------------------------------------
# Batch process images
# -----------------------------------------------------
image_files = sorted([
    f for f in os.listdir(input_folder)
    if f.lower().endswith((".png", ".jpg", ".jpeg"))
])

if max_images is not None:
    image_files = image_files[:max_images]

for i, file_name in enumerate(image_files, start=1):
    img_path = os.path.join(input_folder, file_name)
    output_path = os.path.join(output_folder, f"processed_{os.path.splitext(file_name)[0]}.png")

    # Load image into the compositor node
    img = bpy.data.images.load(img_path)
    img_node.image = img

    # Randomize parameters
    randomize_nodes()

    # Set output path
    bpy.context.scene.render.filepath = output_path

    # Render and save
    bpy.ops.render.render(write_still=True)

    # Cleanup loaded image to free memory
    bpy.data.images.remove(img)

    print(f"Rendered {i}/{len(image_files)}: {file_name}")

print("✅ Batch processing complete!")
