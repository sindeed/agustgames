import bpy
import math
from mathutils import Vector


OUT_BLEND = "/Users/antonek/Documents/Agust games/waterwar-release/waterwar/art/waterwar-blender-style-preview.blend"
OUT_RENDER = "/private/tmp/waterwar-blender-style-preview.png"


def material(name, color, metallic=0.0, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


WOOD = material("Warm ship wood", (0.28, 0.08, 0.018))
WOOD_LIGHT = material("Deck wood", (0.52, 0.20, 0.035))
GOLD = material("Treasure gold", (0.95, 0.52, 0.06), 0.45, 0.25)
SEA = material("Ocean blue", (0.015, 0.22, 0.36), 0.15, 0.28)
SAND = material("Island sand", (0.72, 0.56, 0.24))
LEAF = material("Palm green", (0.04, 0.28, 0.08))
WHALE = material("Whale blue", (0.055, 0.21, 0.34), 0.05, 0.45)
LANTERN = material("Lantern glow", (1.0, 0.38, 0.05), 0.0, 0.18)


def cube(name, loc, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Soft Blender edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    obj.data.materials.append(mat)
    return obj


def uv(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def cylinder(name, loc, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def point_light(loc, energy, color, radius=3):
    bpy.ops.object.light_add(type="POINT", location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.color = color
    light.data.shadow_soft_size = radius
    return light


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for data in (bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    pass

# Ocean and soft islands: a real Blender-made version of the WaterWar visual language.
cube("Ocean", (0, 0, -0.7), (38, 24, 0.3), SEA, 0.25)
for x, y in [(-20, 9), (24, 10), (27, -8)]:
    uv("Island", (x, y, -0.08), (5.5, 4.2, 0.75), SAND)
    for dx, dy in [(-1.3, 0.4), (1.2, -0.6)]:
        trunk = cylinder("Palm trunk", (x + dx, y + dy, 2.0), 0.32, 4, WOOD)
        for angle in range(0, 360, 60):
            leaf = cube("Palm leaf", (x + dx + math.cos(math.radians(angle)) * 1.25, y + dy + math.sin(math.radians(angle)) * 1.25, 4.0), (1.3, 0.28, 0.12), LEAF, 0.1)
            leaf.rotation_euler = (0.35, 0.0, math.radians(angle))

# Player raft: every plank gets its own rounded Blender geometry.
for i in range(3):
    plank = cube("Raft plank", (-18 + i * 2.25, -8, 0.25), (1.0, 2.3, 0.22), WOOD_LIGHT, 0.14)
    plank.rotation_euler.z = (-0.035 if i % 2 else 0.035)
for dx, dy in [(-20, -7), (-16, -8.7)]:
    cube("Raft furniture", (dx, dy, 0.9), (0.65, 0.65, 0.55), WOOD, 0.12)

# A single representative giant sunken pirate ship, rendered in the intended new Blender style.
ship_x, ship_y = 2, -2
cube("Ship hull", (ship_x, ship_y, 2.0), (13.5, 6.5, 2.2), WOOD, 0.45)
for level, z in enumerate([3.8, 6.4, 9.0]):
    deck = cube("Walkable ship deck", (ship_x, ship_y, z), (12.8 - level * 0.7, 6.05 - level * 0.4, 0.26), WOOD_LIGHT, 0.12)
    for room_x, label in [(-8, "Cannon room"), (0, "Treasure room"), (8, "Library room")]:
        wall = cube(label, (ship_x + room_x, ship_y, z + 1.1), (3.1, 0.22, 1.0), WOOD, 0.08)
        point_light((ship_x + room_x, ship_y - 1.4, z + 1.8), 260, (1.0, 0.34, 0.09), 1.5)
        uv("Lantern", (ship_x + room_x, ship_y - 1.15, z + 1.7), (0.15, 0.15, 0.15), LANTERN)
    if level < 2:
        stairs = cube("Wide stairs", (ship_x, ship_y - 3.0, z + 0.55), (1.7, 1.45, 0.32), WOOD_LIGHT, 0.1)
        stairs.rotation_euler.x = math.radians(-18)

# Mast, treasure and cannons establish the identifiable WaterWar objects.
cylinder("Broken mast", (ship_x - 2.4, ship_y + 0.5, 12), 0.42, 8.5, WOOD, (0.05, 0.08, 0))
cube("Golden treasure chest", (ship_x, ship_y - 2, 4.65), (1.3, 0.75, 0.65), GOLD, 0.16)
for y in [-4.3, -3.2, -2.1]:
    cannon = cylinder("Deck cannon", (ship_x - 8, ship_y + y, 6.9), 0.28, 2.1, WOOD, (0, math.radians(90), 0))

# The whale stays recognizable but has smoother Blender-style shapes.
uv("Great whale body", (20, -10, 1.4), (8.4, 3.2, 2.6), WHALE)
uv("Whale tail left", (27.0, -11.6, 1.5), (2.4, 0.7, 0.3), WHALE)
uv("Whale tail right", (27.0, -8.4, 1.5), (2.4, 0.7, 0.3), WHALE)
uv("Whale fin", (19, -13.2, 0.5), (2.0, 0.4, 0.35), WHALE)

# Presentation camera and friendly underwater lighting.
bpy.ops.object.light_add(type="AREA", location=(2, -5, 25))
key = bpy.context.object
key.data.energy = 1200
key.data.shape = "DISK"
key.data.size = 15
key.data.color = (0.3, 0.7, 1.0)
bpy.ops.object.light_add(type="SUN", location=(0, 0, 20))
bpy.context.object.data.energy = 1.4
bpy.context.object.data.color = (0.35, 0.75, 1.0)

bpy.ops.object.camera_add(location=(37, -47, 29))
camera = bpy.context.object
bpy.context.scene.camera = camera
target = Vector((2, -2, 4.5))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 47

world = bpy.context.scene.world
world.color = (0.005, 0.02, 0.05)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = OUT_RENDER
scene.render.film_transparent = False
scene.view_settings.look = "AgX - Medium High Contrast"

bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.render.render(write_still=True)
