import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import './statistics.css';
import * as XLSX from 'xlsx';
import { storage } from "../firebase";
import { ref, getDownloadURL } from "firebase/storage";

const COLORS = ['#3498db', '#f1c40f', '#8e44ad'];

const StatisticsPage = () => {
    const [loading, setLoading] = useState(true);
    const [dailySales, setDailySales] = useState([]);
    const [monthlySales, setMonthlySales] = useState([]);
    const [yearlySales, setYearlySales] = useState([]);
    const [inventoryData, setInventoryData] = useState([]);
    const [paymentData, setPaymentData] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchExcelData();
    }, []);

    const fetchExcelData = async () => {
        setLoading(true);
        try {
            const fileRef = ref(storage, 'SAMPLEDATA.xlsx');
            const url = await getDownloadURL(fileRef);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            // Check if the sheets exist
            if (!workbook.Sheets['Inventory'] || !workbook.Sheets['Cashier']) {
                throw new Error('Required sheets not found in the Excel file');
            }

            const inventorySheet = XLSX.utils.sheet_to_json(workbook.Sheets['Inventory']);
            const cashierSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Cashier']);

            processInventoryData(inventorySheet);
            processSalesData(cashierSheet);
        } catch (error) {
            console.error('Error fetching Excel data:', error);
        }
        setLoading(false);
    };

    const processInventoryData = (data) => {
        console.log("Raw inventory data:", data); // Debugging log
        const formattedData = data.map(item => ({
            item: item['Item Name'],
            stock: item['Quantity'] || 0
        }));
        console.log("Processed inventory data:", formattedData); // Debugging log
        setInventoryData(formattedData);
    };

    const processSalesData = (data) => {
        console.log("Raw sales data:", data); // Debugging log
        const dailySummary = {};
        const monthlySummary = {};
        const yearlySummary = {};
        const paymentSummary = {};

        data.forEach(entry => {
            if (!entry['Date & Time'] || !entry['Grand Total']) return;

            const [date] = entry['Date & Time'].split(' ');
            const [year, month, day] = date.split('-');
            const amount = parseFloat(entry['Grand Total'] || 0);
            const paymentMethod = entry['Payment Method'] || 'Other';

            dailySummary[date] = (dailySummary[date] || 0) + amount;
            monthlySummary[`${year}-${month}`] = (monthlySummary[`${year}-${month}`] || 0) + amount;
            yearlySummary[year] = (yearlySummary[year] || 0) + amount;
            paymentSummary[paymentMethod] = (paymentSummary[paymentMethod] || 0) + amount;
        });

        console.log("Processed daily sales:", dailySummary); // Debugging log
        console.log("Processed monthly sales:", monthlySummary); // Debugging log
        console.log("Processed yearly sales:", yearlySummary); // Debugging log
        console.log("Processed payment data:", paymentSummary); // Debugging log

        setDailySales(Object.keys(dailySummary).map(date => ({ date, amount: dailySummary[date] })));
        setMonthlySales(Object.keys(monthlySummary).map(date => ({ date, amount: monthlySummary[date] })));
        setYearlySales(Object.keys(yearlySummary).map(date => ({ date, amount: yearlySummary[date] })));
        setPaymentData(Object.keys(paymentSummary).map(method => ({ name: method, value: paymentSummary[method] })));
    };

    return (
        <div className="statistics-container">
            <div className="statistics-header">
                <h1>Statistics</h1>
                <div className="button-group">
                    <button onClick={() => navigate('/app')} className="nav-button pos">POS</button>
                    <button onClick={() => navigate('/inventory')} className="nav-button inventory">Inventory</button>
                </div>
            </div>

            <div className="statistics-content">
                {/* First Column: Buttons */}
                <div className="statistics-buttons">
                    <div className="report-buttons">
                        <h2>Daily Sales Report</h2>
                        <button className="generate-report">Generate Report</button>
                        <button className="print-report">Print Report</button>
                    </div>
                    <div className="report-buttons">
                        <h2>Monthly Sales Report</h2>
                        <button className="generate-report">Generate Report</button>
                        <button className="print-report">Print Report</button>
                    </div>
                    <div className="report-buttons">
                        <h2>Yearly Sales Report</h2>
                        <button className="generate-report">Generate Report</button>
                        <button className="print-report">Print Report</button>
                    </div>
                    <div className="report-buttons">
                        <h2>Quarterly Sales Report</h2>
                        <button className="generate-report">Generate Report</button>
                        <button className="print-report">Print Report</button>
                    </div>
                </div>

                {/* Second Column: Graphs */}
                <div className="statistics-graphs">
                    <div className="chart-box">
                        <h2>Sales per Day</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailySales}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="amount" stroke="#8884d8" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-box">
                        <h2>Sales per Month</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlySales}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="amount" stroke="#ff7300" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-box">
                        <h2>Sales per Year</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={yearlySales}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="amount" stroke="#0088FE" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-box">
                        <h2>Inventory Status</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={inventoryData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="item" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="stock" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-box">
                        <h2>Payment Modes</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Third Column: Reports */}
                <div className="statistics-reports">
                    <h2>Reports</h2>
                    <p>No reports available yet.</p>
                </div>
            </div>
        </div>
        
    );

    
};



export default StatisticsPage;
