#!/usr/bin/env python3

import json
import sys
import subprocess
from urllib.parse import urlencode, quote
import socket
import argparse

from argparse import RawDescriptionHelpFormatter

EXTENSION = "8w8kkr8typ/dmenu"
COMMAND = "dmenu"

parser = argparse.ArgumentParser(
    prog="raycast_dmenu",
    description="""dmenu-like raycast extension

Provide option list as stdin, the stdout will contain the chosen option.
If no option was chosen, the program will exit with the return code set to 1.""",
    formatter_class=RawDescriptionHelpFormatter,
)

parser.add_argument("-p", "--prompt", help="search bar placeholder text")
args, unknown_args = parser.parse_known_args()


server = socket.socket()
server.bind(("127.0.0.1", 0))
server.listen(1)

host, port = server.getsockname()

arguments = {
    "host": host,
    "port": str(port),
}

if args.prompt is not None:
    arguments["prompt"] = args.prompt

query = urlencode({"arguments": json.dumps(arguments)}, quote_via=quote)

url = f"raycast://extensions/{EXTENSION}/{COMMAND}?{query}"
subprocess.run(["open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

elements = list(sys.stdin)

(conn, _) = server.accept()

conn.send(f"{len(elements)}\n".encode("utf-8"))
for el in elements:
    conn.send(f"{el.strip()}\n".encode("utf-8"))

result = b""
while len(data := conn.recv(1024)) != 0:
    result += data

final_result = result.decode("utf-8").strip()
if final_result == "":
    exit(1)
print(final_result)
