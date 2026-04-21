# -*- coding: utf-8 -*-
path = r'C:/Users/User/sunghospital/modules/meetings.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken HTML entity in the empty-state text
# The broken sequence contains an invalid/malformed entity - replace the whole empty-state string
broken = "'\u6c92\u6709\u7b26\u5408&#26"  # 沒有符合&#26...
if broken not in content:
    # Try to find via the surrounding context
    import re
    # Replace entire empty-state div text inside renderTasks
    content = re.sub(
        r"rows \|\| '<div style=\"text-align:center;padding:30px;color:var\(--faint\);font-size:13px\">[^']*</div>'",
        "rows || '<div style=\"text-align:center;padding:30px;color:var(--faint);font-size:13px\">\u6c92\u6709\u7b26\u5408\u689d\u4ef6\u7684\u4efb\u52d9</div>'",
        content
    )
    print("Used regex replacement")
else:
    # Direct string replacement
    old_chunk = "\u6c92\u6709\u7b26\u5408&#26\ufffd&#20214;&#30340;&#20219;&#21153;"
    new_chunk = "\u6c92\u6709\u7b26\u5408\u689d\u4ef6\u7684\u4efb\u52d9"
    content = content.replace(old_chunk, new_chunk)
    print("Used direct replacement")

# Also fix remaining HTML entities for Chinese text in the c.innerHTML block
# Fix entities in the header label
replacements = [
    ('&#20219;&#21153;&#28165;&#21934;&#65288;', '\u4efb\u52d9\u6e05\u55ae\uff08'),
    ('&#39033;&#65289;', '\u9805\uff09'),
    ('&#28165;&#38500;&#24050;&#23436;&#25104;&#65288;', '\u6e05\u9664\u5df2\u5b8c\u6210\uff08'),
    ('&#65289;</button>', '\uff09</button>'),
    ('&#36664;&#20837;&#20219;&#21153;...', '\u8f38\u5165\u4efb\u52d9...'),
    ('&#19968;&#33324;', '\u4e00\u822c'),
    ('&#24459;&#20214;', '\u6025\u4ef6'),
    ('&#32161;&#24613;', '\u7dca\u6025'),
    ('&#26032;&#22686;', '\u65b0\u589e'),
    # Fix emoji entities
    ('&#128203;', '\U0001F4DD'),
    ('&#9999;', '\u270f'),
    ('&#215;', '\xd7'),
    ('&#10003;', '\u2713'),
    ('&#9680;', '\u25d1'),
    ('&#32232;&#36655;', '\u7de8\u8f2f'),
    ('&#21024;&#38500;', '\u522a\u9664'),
]
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"Replaced: {old[:20]}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
