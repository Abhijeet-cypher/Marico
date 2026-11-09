import { useEffect, useState } from "react";
import { Button, Card, Drawer, Table, Tag, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api } from "../api";
import CallSummary, { outcomeColors } from "../components/CallSummary";
import Transcript from "../components/Transcript";

export default function History({ active }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  function loadCalls() {
    setLoading(true);
    api.getCalls()
      .then(setCalls)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }

  // reload every time the tab is opened
  useEffect(() => {
    if (active) loadCalls();
  }, [active]);

  return (
    <Card
      title="Previous calls"
      extra={<Button icon={<ReloadOutlined />} onClick={loadCalls}>Refresh</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={calls}
        scroll={{ x: 700 }}
        onRow={(call) => ({ onClick: () => setSelected(call), style: { cursor: "pointer" } })}
        locale={{ emptyText: "No calls yet. Start a new call to see it here." }}
        columns={[
          { title: "Date", dataIndex: "created_at", render: (d) => new Date(d).toLocaleString() },
          { title: "Retailer", dataIndex: "retailer_name" },
          {
            title: "Outcome",
            dataIndex: "outcome",
            render: (o) => <Tag color={outcomeColors[o]}>{o}</Tag>,
          },
          {
            title: "Products",
            dataIndex: "products",
            render: (list) => list.map((p) => p.name).join(", ") || "-",
          },
          { title: "Follow-up", dataIndex: "follow_up" },
        ]}
      />

      <Drawer title="Call details" width={560} open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <CallSummary call={selected} />
            <h4 style={{ margin: "24px 0 8px" }}>Transcript</h4>
            <Transcript messages={selected.transcript} height={320} />
          </>
        )}
      </Drawer>
    </Card>
  );
}
