import { ActionPanel, List, Action, closeMainWindow, showToast, Toast } from "@raycast/api";
import { connect, Socket } from "net";
import { useState, useEffect, useRef } from "react";

type Props = {
  arguments: {
    host: string;
    port: string;
    prompt?: string;
  };
};

export default function Command({ arguments: { host, port, prompt } }: Props) {
  const [elements, setElements] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const socket = useRef<Socket | null>(null);
  const isConnecting = useRef(false);  // Flag to prevent multiple connections

  useEffect(() => {
    // Prevent multiple connections if a connection is already being attempted
    if (isConnecting.current || socket.current) return;  
    isConnecting.current = true;

    console.log(`Connecting to socket at ${host}:${port}`);

    const s = connect({ host, port: parseInt(port) });

    socket.current = s;

    let buf = "";

    s.on("connect", () => {
      console.log("Socket connected");
    });

    s.on("data", (data) => {
      buf += data;

      const firstLineEnding = buf.indexOf("\n");
      if (firstLineEnding === -1) return;

      const amount = parseInt(buf.slice(0, firstLineEnding));
      const lines = buf.slice(firstLineEnding + 1).trim().split("\n");

      if (lines.length === amount) {
        setElements(lines.map((s) => s.trim()).filter((s) => s.length !== 0));
        setIsLoaded(true);
        console.log("Data received successfully, elements set");
      }
    });

    s.on("error", (err) => {
      console.log("Socket error:", err.message);
      if (err.message.includes("ECONNRESET")) {
        // Gracefully ignore ECONNRESET, as it can occur on socket closure
        console.log("Ignoring ECONNRESET error");
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Socket Error",
          message: err.message,
        });
        setElements([]); // Clear elements on error
      }
    });

    s.on("close", () => {
      console.log("Socket closed");
    });

    // Cleanup on unmount
    return () => {
      if (socket.current != null) {
        socket.current.end();
        socket.current = null;  // Ensure the socket reference is cleared
      }
      isConnecting.current = false;
      console.log("Socket connection ended");
    };
  }, [host, port]);

  const handleSelection = (item: string) => {
    const s = socket.current;
    if (s == null) {
      showToast({ style: Toast.Style.Failure, title: "Socket disconnected" });
      closeMainWindow();
      return;
    }

    s.write(item + "\n");  // Send the selected item to the backend
    s.end();               // Close the socket AFTER sending the selection

    closeMainWindow();      // Close Raycast window
    setElements([]);        // Clear the elements
    console.log("Item selected and sent to backend");
  };

  return (
    <List 
      isLoading={!isLoaded} 
      searchBarPlaceholder={prompt || "Choose an option"}
    >
      {elements.map((item, idx) => (
        <List.Item
          title={item}
          key={idx}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={() => handleSelection(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
