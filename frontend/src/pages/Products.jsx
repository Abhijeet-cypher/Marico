import { useEffect, useState } from "react";
import { Card, Table, Tag, message } from "antd";
import { api } from "../api";

function stockTag(stock) {
  if (stock === 0) return <Tag color="red">Out of stock</Tag>;
  if (stock < 100) return <Tag color="orange">Low ({stock})</Tag>;
  return <Tag color="green">{stock} units</Tag>;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [retailers, setRetailers] = useState([]);

  useEffect(() => {
    api.getProducts().then(setProducts).catch((e) => message.error(e.message));
    api.getRetailers().then(setRetailers).catch((e) => message.error(e.message));
  }, []);

  return (
    <>
      <Card title="Product catalogue" style={{ marginBottom: 16 }}>
        <Table
          rowKey="name"
          dataSource={products}
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            { title: "Product", dataIndex: "name" },
            { title: "MRP", dataIndex: "mrp", render: (v) => `₹${v}` },
            { title: "Retailer price", dataIndex: "retailerPrice", render: (v) => `₹${v}` },
            { title: "Units / case", dataIndex: "unitsPerCase" },
            { title: "Stock", dataIndex: "stock", render: stockTag },
            { title: "Scheme", dataIndex: "scheme" },
          ]}
        />
      </Card>

      <Card title="Retailers">
        <Table
          rowKey="id"
          dataSource={retailers}
          pagination={false}
          scroll={{ x: 600 }}
          columns={[
            { title: "Store", dataIndex: "name" },
            { title: "Owner", dataIndex: "owner" },
            { title: "City", dataIndex: "city" },
            { title: "Last order", dataIndex: "last_order" },
          ]}
        />
      </Card>
    </>
  );
}
