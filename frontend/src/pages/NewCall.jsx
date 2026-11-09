import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Input, Row, Select, Space, Spin, Switch, Tag, message } from "antd";
import { AudioOutlined, PhoneOutlined, SendOutlined, SoundOutlined, StopOutlined } from "@ant-design/icons";
import { api } from "../api";
import { useSpeech } from "../useSpeech";
import Transcript from "../components/Transcript";
import CallSummary from "../components/CallSummary";

const GREETING = "Hello, this is Priya from Marico. How can I help you today?";

const SAMPLE_QUESTIONS = [
  "What is the price of Parachute 500ml?",
  "Is there any scheme on Saffola Gold?",
  "Is Saffola Active 2L available?",
  "I want 10 cases of Livon hair serum",
  "Please call me back tomorrow",
];

export default function NewCall() {
  const [retailers, setRetailers] = useState([]);
  const [retailerId, setRetailerId] = useState(null);
  const [onCall, setOnCall] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [result, setResult] = useState(null);

  const speech = useSpeech((spoken) => sendMessage(spoken));
  const retailer = retailers.find((r) => r.id === retailerId);

  useEffect(() => {
    api.getRetailers()
      .then((list) => {
        setRetailers(list);
        setRetailerId(list[0]?.id);
      })
      .catch((err) => message.error(err.message));
  }, []);

  function startCall() {
    setResult(null);
    setMessages([{ role: "agent", text: GREETING }]);
    setOnCall(true);
    if (voiceReplies) speech.speak(GREETING);
  }

  async function sendMessage(content) {
    content = content.trim();
    if (!content || sending) return;

    const updated = [...messages, { role: "user", text: content }];
    setMessages(updated);
    setText("");
    setSending(true);
    try {
      const data = await api.chat(retailerId, updated);
      setMessages([...updated, { role: "agent", text: data.reply }]);
      if (voiceReplies) speech.speak(data.reply);
    } catch (err) {
      message.error(err.message);
      setMessages(messages);
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function endCall() {
    if (!messages.some((m) => m.role === "user")) {
      message.warning("Talk to the retailer first, then end the call.");
      return;
    }
    speech.stopSpeaking();
    setEnding(true);
    try {
      const call = await api.endCall(retailerId, messages);
      setResult(call);
      setOnCall(false);
      message.success("Call saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setEnding(false);
    }
  }

  const retailerDetails = retailer && (
    <Descriptions column={1} size="small">
      <Descriptions.Item label="Owner">{retailer.owner}</Descriptions.Item>
      <Descriptions.Item label="City">{retailer.city}</Descriptions.Item>
      <Descriptions.Item label="Last order">{retailer.last_order}</Descriptions.Item>
    </Descriptions>
  );

  // ---------- screen shown before / after a call ----------
  if (!onCall) {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Start a new call">
            <p style={{ marginTop: 0 }}>Choose the retailer you want to speak to.</p>
            <Select
              style={{ width: "100%", marginBottom: 16 }}
              value={retailerId}
              onChange={setRetailerId}
              options={retailers.map((r) => ({ value: r.id, label: `${r.name} - ${r.city}` }))}
            />
            {retailerDetails}
            <Button type="primary" icon={<PhoneOutlined />} size="large" block onClick={startCall} style={{ marginTop: 16 }}>
              Start call
            </Button>
          </Card>
        </Col>
        {result && (
          <Col xs={24} lg={14}>
            <Card title="Last call summary">
              <CallSummary call={result} />
            </Card>
          </Col>
        )}
      </Row>
    );
  }

  // ---------- screen during a call ----------
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card
          title={
            <Space>
              {retailer.name}
              <Tag color="green">Live call</Tag>
            </Space>
          }
          extra={
            <Button danger type="primary" loading={ending} onClick={endCall}>
              End call
            </Button>
          }
        >
          {!speech.supported && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Voice input is not supported in this browser. Please type your messages (Chrome or Edge supports voice)."
            />
          )}

          <Transcript messages={messages} typing={sending} />

          <div style={{ height: 28, marginTop: 8, color: "#666" }}>
            {speech.voiceState === "preparing" && (
              <Space>
                <Spin size="small" /> Preparing voice...
              </Space>
            )}
            {speech.voiceState === "speaking" && (
              <Space>
                <SoundOutlined style={{ color: "#0b5cab" }} /> Speaking...
                <Button size="small" icon={<StopOutlined />} onClick={speech.stopSpeaking}>
                  Stop
                </Button>
              </Space>
            )}
          </div>

          <Space.Compact style={{ width: "100%", marginTop: 12 }}>
            <Input
              size="large"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPressEnter={() => sendMessage(text)}
              disabled={sending}
            />
            <Button size="large" type="primary" icon={<SendOutlined />} onClick={() => sendMessage(text)} disabled={sending}>
              Send
            </Button>
          </Space.Compact>

          {speech.supported && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Button
                shape="circle"
                size="large"
                danger={speech.listening}
                type={speech.listening ? "primary" : "default"}
                className={speech.listening ? "mic-listening" : ""}
                icon={<AudioOutlined />}
                style={{ width: 56, height: 56 }}
                onClick={speech.listening ? speech.stopListening : speech.startListening}
                disabled={sending}
              />
              <div style={{ color: "#888", marginTop: 6 }}>
                {speech.listening ? "Listening... speak now" : "Tap the mic and speak"}
              </div>
            </div>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <Card title="Retailer" size="small" style={{ marginBottom: 16 }}>
          {retailerDetails}
        </Card>
        <Card title="Try asking" size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            {SAMPLE_QUESTIONS.map((q) => (
              <Button key={q} block style={{ textAlign: "left", whiteSpace: "normal", height: "auto" }} onClick={() => sendMessage(q)} disabled={sending}>
                {q}
              </Button>
            ))}
          </Space>
        </Card>
        <Card title="Settings" size="small">
          <Space>
            <Switch checked={voiceReplies} onChange={(on) => { setVoiceReplies(on); if (!on) speech.stopSpeaking(); }} />
            Speak replies aloud
          </Space>
        </Card>
      </Col>
    </Row>
  );
}
