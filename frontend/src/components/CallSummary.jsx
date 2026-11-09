import { Descriptions, Table, Tag } from "antd";

export const outcomeColors = {
  "Order enquiry": "green",
  "Follow-up needed": "orange",
  "Not interested": "red",
  "Information only": "blue",
};

export default function CallSummary({ call }) {
  return (
    <>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Retailer">{call.retailer_name}</Descriptions.Item>
        <Descriptions.Item label="Date">{new Date(call.created_at).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Outcome">
          <Tag color={outcomeColors[call.outcome]}>{call.outcome}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Summary">{call.summary}</Descriptions.Item>
        <Descriptions.Item label="Follow-up">{call.follow_up}</Descriptions.Item>
      </Descriptions>

      <h4 style={{ margin: "16px 0 8px" }}>Product interest</h4>
      <Table
        size="small"
        pagination={false}
        rowKey="name"
        dataSource={call.products}
        locale={{ emptyText: "No products discussed" }}
        columns={[
          { title: "Product", dataIndex: "name" },
          {
            title: "Quantity (cases)",
            dataIndex: "quantity_cases",
            render: (q) => q ?? "-",
          },
        ]}
      />
    </>
  );
}
