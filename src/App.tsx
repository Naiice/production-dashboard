import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import {
  Download,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// -------------------------------------------------------------------------
// ⭐️ URL ของ Web App
// -------------------------------------------------------------------------
const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbyvSN9SEuk86NNDmuX3FqG_eveoz98pSKnehQYcFoXZfqI0-YbGftQ4tWaJQkcC4weO2A/exec";

// --- โครงสร้างข้อมูลเริ่มต้นสำหรับการทดสอบ ---
const initialData = [
  {
    id: 1,
    timestamp: "26/03/2569 10:00:00",
    line: "Line1",
    partCode: "P001",
    partName: "Gear Box",
    quantity: 50,
    unit: "EA",
    amount: 120,
    totalAmount: 6000,
  },
  {
    id: 2,
    timestamp: "26/03/2569 10:15:00",
    line: "Line2",
    partCode: "P002",
    partName: "Motor Shaft",
    quantity: 200,
    unit: "G",
    amount: 2.5,
    totalAmount: 500,
  },
];

// ฟังก์ชันช่วยค้นหาคีย์ใน Object โดยละเว้นตัวพิมพ์เล็กใหญ่และช่องว่าง
const getFlexibleValue = (obj, searchKey) => {
  if (!obj) return undefined;
  const normalizedSearch = searchKey.toLowerCase().replace(/[^a-z0-9]/g, "");
  const foundKey = Object.keys(obj).find(
    (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedSearch
  );
  return foundKey ? obj[foundKey] : undefined;
};

// ฟังก์ชันจัดฟอร์แมตวันที่ให้อ่านง่าย (แก้ปัญหาติด T และ Z)
const formatTimestamp = (ts) => {
  if (!ts) return "";
  let str = String(ts);
  // ถ้ามาเป็น ISO Format เช่น 2569-03-26T13:50:41.000Z ให้แปลงให้อ่านง่าย
  if (str.includes("T") && str.includes("Z")) {
    str = str.replace("T", " ").split(".")[0];
  }
  return str;
};

export default function App() {
  // --- State Management ---
  const [data, setData] = useState(initialData);
  const [filterDate, setFilterDate] = useState("");
  const [formData, setFormData] = useState({
    line: "Line1",
    partCode: "",
    partName: "",
    quantity: "",
    unit: "EA",
    amount: "",
    totalAmount: 0,
  });

  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // โหลดข้อมูลอัตโนมัติเมื่อเริ่มต้น
  useEffect(() => {
    if (DEFAULT_API_URL) {
      fetchData(DEFAULT_API_URL);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === "quantity" || name === "amount") {
      const qty = parseFloat(newFormData.quantity) || 0;
      const amt = parseFloat(newFormData.amount) || 0;
      newFormData.totalAmount = qty * amt;
    }

    setFormData(newFormData);
  };

  const fetchData = async (urlToFetch = apiUrl) => {
    if (!urlToFetch) {
      showStatus("warning", "กรุณาใส่ Google Apps Script URL ก่อนเชื่อมต่อ");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(urlToFetch);
      const result = await response.json();
      if (Array.isArray(result) && result.length > 0) {
        const formattedData = result.map((item, index) => {
          // ดึงค่าอย่างยืดหยุ่น ป้องกันปัญหาชื่อหัวตารางไม่ตรง
          const qty = parseFloat(getFlexibleValue(item, "quantity")) || 0;
          const amt =
            parseFloat(
              getFlexibleValue(item, "amountthb") ||
                getFlexibleValue(item, "amount")
            ) || 0;
          const fetchedTotal =
            parseFloat(
              getFlexibleValue(item, "totalamountthb") ||
                getFlexibleValue(item, "totalamount")
            ) || 0;
          const rawTimestamp = getFlexibleValue(item, "timestamp");

          return {
            id: index,
            timestamp: formatTimestamp(rawTimestamp),
            line: getFlexibleValue(item, "line") || "",
            partCode: getFlexibleValue(item, "partcode") || "",
            partName: getFlexibleValue(item, "partname") || "",
            quantity: qty,
            unit: getFlexibleValue(item, "unit") || "",
            amount: amt,
            totalAmount: fetchedTotal > 0 ? fetchedTotal : qty * amt, // คำนวณให้ถ้าเป็น 0
          };
        });
        setData(formattedData);
        showStatus("success", "อัพเดทข้อมูลจาก Google Sheets ล่าสุดแล้ว");
      } else if (result.length === 0) {
        setData([]);
        showStatus("success", "เชื่อมต่อ Google Sheets แล้ว (ยังไม่มีข้อมูล)");
      }
    } catch (error) {
      showStatus("error", "ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบ URL");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.partCode || !formData.quantity || !formData.amount) {
      showStatus("warning", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const newData = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      amount: parseFloat(formData.amount),
      // บันทึกเวลาด้วยรูปแบบที่อ่านง่าย
      timestamp: new Date().toLocaleString("th-TH"),
      id: Date.now(),
    };

    if (!apiUrl) {
      setData([newData, ...data]);
      resetForm();
      showStatus(
        "success",
        "บันทึกข้อมูลจำลองสำเร็จ (ยังไม่ได้เชื่อม Google Sheets)"
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          data: JSON.stringify(newData),
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        setData([newData, ...data]);
        resetForm();
        showStatus("success", "บันทึกลง Google Sheets สำเร็จแล้ว!");
      }
    } catch (error) {
      console.log("Post attempt finished.", error);
      setData([newData, ...data]);
      resetForm();
      showStatus("success", "ส่งคำสั่งบันทึกลง Sheet แล้ว");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      line: "Line1",
      partCode: "",
      partName: "",
      quantity: "",
      unit: "EA",
      amount: "",
      totalAmount: 0,
    });
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: "", text: "" }), 6000);
  };

  // --- ระบบกรองข้อมูลด้วยวันที่ ---
  const filteredData = useMemo(() => {
    if (!filterDate) return data;
    const [y, m, d] = filterDate.split("-");
    const thaiYear = parseInt(y) + 543;

    // รูปแบบวันที่ที่อาจจะมาจาก Google Sheets
    const patterns = [
      `${parseInt(d)}/${parseInt(m)}/${thaiYear}`,
      `${d}/${m}/${thaiYear}`,
      filterDate,
      `${thaiYear}-${m}-${d}`,
      `${parseInt(d)}/${parseInt(m)}/${y}`,
      `${d}/${m}/${y}`,
    ];

    return data.filter((item) => {
      const ts = String(item.timestamp);
      return patterns.some((pattern) => ts.includes(pattern));
    });
  }, [data, filterDate]);

  const exportCSV = () => {
    const headers = [
      "Timestamp",
      "Line",
      "Part Code",
      "Part Name",
      "Quantity",
      "Unit",
      "Amount (THB)",
      "Total Amount (THB)",
    ];
    const csvRows = [];
    csvRows.push(headers.join(","));

    filteredData.forEach((row) => {
      const values = [
        row.timestamp,
        row.line,
        row.partCode,
        row.partName,
        row.quantity,
        row.unit,
        row.amount,
        row.totalAmount,
      ].map((val) => `"${val}"`);
      csvRows.push(values.join(","));
    });

    const csvData = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const csvUrl = URL.createObjectURL(csvData);
    const link = document.createElement("a");
    link.href = csvUrl;
    link.download = `Production_Data_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  // --- เตรียมข้อมูลสำหรับกราฟ ---
  const chartDataByLine = useMemo(() => {
    const grouped = {};
    ["Line1", "Line2", "Line3", "Line4", "Line5"].forEach(
      (l) => (grouped[l] = [])
    );

    filteredData.forEach((item) => {
      if (!grouped[item.line]) grouped[item.line] = [];
      const existing = grouped[item.line].find(
        (x) => x.partCode === item.partCode
      );
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalAmount += item.totalAmount;
      } else {
        grouped[item.line].push({
          name: item.partCode,
          partName: item.partName,
          quantity: item.quantity,
          totalAmount: item.totalAmount,
        });
      }
    });
    return grouped;
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Settings */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Production Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              ระบบบันทึกและแสดงผลข้อมูลการผลิต
            </p>
          </div>

          <div className="flex w-full md:w-auto gap-3 items-center">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              title="เลือกวันที่เพื่อดูข้อมูลเฉพาะวัน"
              className="flex-1 md:w-auto px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
            />
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              <span className="hidden md:inline">โหลดข้อมูลใหม่</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg.text && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : statusMsg.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-yellow-50 text-yellow-700 border border-yellow-200"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <p className="text-sm font-medium">{statusMsg.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section 1: Input Data */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                1
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                ฟอร์มบันทึกข้อมูล
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Line
                </label>
                <select
                  name="line"
                  value={formData.line}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                >
                  <option value="Line1">Line 1</option>
                  <option value="Line2">Line 2</option>
                  <option value="Line3">Line 3</option>
                  <option value="Line4">Line 4</option>
                  <option value="Line5">Line 5</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Part Code
                  </label>
                  <input
                    type="text"
                    name="partCode"
                    value={formData.partCode}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. P001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Part Name
                  </label>
                  <input
                    type="text"
                    name="partName"
                    value={formData.partName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Gear"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                  >
                    <option value="EA">EA (ชิ้น)</option>
                    <option value="G">G (กรัม)</option>
                    <option value="KG">KG (กิโลกรัม)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (THB) / Unit
                </label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Total Amount (Auto Calculated)
                </label>
                <div className="text-2xl font-bold text-indigo-700">
                  ฿{" "}
                  {formData.totalAmount.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors mt-4"
              >
                <Save size={18} />
                {isLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </form>
          </div>

          {/* Section 2: Monitor (Charts) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b pb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                  2
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  Monitor (แสดงผลแยกตาม Line)
                </h2>
              </div>

              <div
                className="flex-1 overflow-y-auto pr-2"
                style={{ maxHeight: "600px" }}
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {["Line1", "Line2", "Line3", "Line4", "Line5"].map((line) => {
                    const lineData = chartDataByLine[line];
                    if (!lineData || lineData.length === 0) return null;

                    return (
                      <div
                        key={line}
                        className="border border-slate-100 rounded-xl p-4 bg-slate-50 min-w-0"
                      >
                        <h3 className="font-bold text-slate-700 mb-4 border-l-4 border-emerald-500 pl-2">
                          {line}
                        </h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={lineData}
                              margin={{
                                top: 10,
                                right: 30,
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e2e8f0"
                              />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: "#3b82f6" }}
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: "#10b981" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "8px",
                                  border: "none",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                }}
                                formatter={(value, name) => [
                                  value.toLocaleString("th-TH"),
                                  name === "quantity"
                                    ? "Quantity"
                                    : "Total Amount (THB)",
                                ]}
                              />
                              <Legend wrapperStyle={{ paddingTop: "10px" }} />
                              <Bar
                                yAxisId="left"
                                dataKey="quantity"
                                name="Quantity"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="totalAmount"
                                name="Total Amount (THB)"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(chartDataByLine).every(
                    (arr) => arr.length === 0
                  ) && (
                    <div className="col-span-full flex flex-col items-center justify-center h-full py-10 text-slate-400">
                      {data.length === 0
                        ? "ไม่มีข้อมูลสำหรับแสดงกราฟ"
                        : "ไม่พบข้อมูลในวันที่เลือก"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Data Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                3
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                ข้อมูลที่บันทึกล่าสุด{" "}
                {filterDate && (
                  <span className="text-sm font-normal text-blue-600">
                    (แสดงเฉพาะวันที่ {filterDate})
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Time</th>
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Part Code</th>
                  <th className="px-4 py-3">Part Name</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Amount/Unit</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr
                    key={row.id || index}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-500">
                      {row.timestamp}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                        {row.line}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-indigo-600">
                      {row.partCode}
                    </td>
                    <td className="px-4 py-3">{row.partName}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {row.quantity.toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                    <td className="px-4 py-3 text-right">
                      ฿{" "}
                      {row.amount.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      ฿{" "}
                      {row.totalAmount.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      {data.length === 0
                        ? "ยังไม่มีข้อมูล"
                        : "ไม่พบข้อมูลในวันที่เลือก"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
