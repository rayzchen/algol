import sys
import re

with open(sys.argv[1]) as f:
    content = f.read()

with open(sys.argv[1], "w+") as f:
    while content.startswith("#") or content.startswith("x = "):
        line = re.match(r".*\n", content)[0]
        f.write(line)
        content = content[len(line):]

    content = content.replace("\n", "")
    pending = ""
    while content:
        if content[0].isdigit():
            token = re.match(r"^\d+[bo$]", content)[0]
        else:
            token = content[0]
        content = content[len(token):]
        if len(pending) + len(token) > 70:
            f.write(pending + "\n")
            pending = token
        else:
            pending += token
    if pending:
        f.write(pending)
