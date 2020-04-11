filename = "tokens.png"
prefix = "token"

# sprite size
w = 40
h = 40
margin = 1

# ids window
xbegin, xend = 0, 3
ybegin, yend = 0, 7

# all ids
max_id = 21
id_pitch = 3
special_names = {}
# max_id - 3: "back",
# max_id - 2: "unknown_back",
# max_id - 1: "unknown"}

print('{"frames": {')

frames = []
for y in range(ybegin, yend):
    for x in range(xbegin, xend):
        i = x + y * id_pitch
        if i >= max_id:
            continue
        name = str(i) if i not in special_names else special_names[i]
        col, row = x - xbegin, y - ybegin
        frames.append('\n'.join([
            '  "{}-{}.png":'.format(prefix, name),
            '  {',
            '    "frame": ' + str({
                "x": margin + col * (w + margin * 2),
                "y": margin + row * (h + margin * 2),
                "w": w,
                "h": h}).replace("'", '"')+',',
            '    "rotated": false,',
            '    "trimmed": false,',
            '    "spriteSourceSize": '+str({
                "x": 0,
                "y": 0,
                "w": w,
                "h": h}).replace("'", '"')+',',
            '    "sourceSize": '+str({
                "w": w,
                "h": h}).replace("'", '"'),
            '  }',
        ]))

print(',\n'.join(frames))
print('},')
print(""""meta": {
  "app": "https://localhost",
  "version": "1.0",
  "image": "%s",
  "format": "RGBA8888",
  "size": {"w":%d,"h":%d},
  "scale": "1",
  "smartupdate": "nothing"
}}""" % (
    filename,
    (xend - xbegin) * (w + margin * 2),
    (yend - ybegin) * (h + margin * 2)))
