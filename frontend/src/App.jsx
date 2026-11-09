import { useState } from "react";
import { ConfigProvider, Layout, Menu } from "antd";
import { HistoryOutlined, PhoneOutlined, ShoppingOutlined } from "@ant-design/icons";
import NewCall from "./pages/NewCall";
import Products from "./pages/Products";
import History from "./pages/History";

const { Header, Content } = Layout;

const menuItems = [
  { key: "call", icon: <PhoneOutlined />, label: "New Call" },
  { key: "products", icon: <ShoppingOutlined />, label: "Products" },
  { key: "history", icon: <HistoryOutlined />, label: "Call History" },
];

export default function App() {
  const [tab, setTab] = useState("call");

  // pages stay mounted and are only hidden, so an ongoing call is not lost when switching tabs
  const show = (name) => ({ display: tab === name ? "block" : "none" });

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#0b5cab", borderRadius: 6 } }}>
      <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
        <Header style={{ display: "flex", alignItems: "center", background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "0 24px" }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: "#0b5cab", marginRight: 32, whiteSpace: "nowrap" }}>
            Retailer Call Assistant
          </div>
          <Menu mode="horizontal" selectedKeys={[tab]} items={menuItems} onClick={(e) => setTab(e.key)} style={{ flex: 1, borderBottom: "none" }} />
        </Header>
        <Content className="page">
          <div style={show("call")}><NewCall /></div>
          <div style={show("products")}><Products /></div>
          <div style={show("history")}><History active={tab === "history"} /></div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
