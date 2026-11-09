import { useEffect, useRef } from "react";
import { Avatar, Spin } from "antd";
import { CustomerServiceOutlined, UserOutlined } from "@ant-design/icons";

// Chat bubbles. role "agent" is the Marico executive, "user" is the retailer.
export default function Transcript({ messages, typing = false, height }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div className="chat-window" style={height ? { height } : undefined}>
      {messages.map((m, i) => (
        <div key={i} className={`chat-row ${m.role}`}>
          <Avatar
            size={32}
            icon={m.role === "agent" ? <CustomerServiceOutlined /> : <UserOutlined />}
            style={{ background: m.role === "agent" ? "#52a37a" : "#8c8c8c", flexShrink: 0 }}
          />
          <div className="bubble">{m.text}</div>
        </div>
      ))}
      {typing && (
        <div className="chat-row agent">
          <Avatar size={32} icon={<CustomerServiceOutlined />} style={{ background: "#52a37a" }} />
          <div className="bubble">
            <Spin size="small" /> <span style={{ color: "#888" }}>typing...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
