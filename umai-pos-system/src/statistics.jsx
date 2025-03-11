import React, { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import firebaseApp from "../firebase";
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import './statistics.css';

const COLORS = ['#3498db', '#f1c40f', '#8e44ad'];

const StatisticsPage = () => {
    const [inventoryData, setInventoryData] = useState([]);
    const [dailySales, setDailySales] = useState([]);
    const [monthlySales, setMonthlySales] = useState([]);
    const [yearlySales, setYearlySales] = useState([]);
    const [paymentData, setPaymentData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchExcelData();
    }, []);

    const fetchExcelData = async () => {
        setLoading(true);

        try {
            const sessionDetails = await getSessionDetails();
            if (!sessionDetails || !sessionDetails.token) {
                console.error("No active session or token found.");
                setLoading(false);
                return;
            }

            // Get file data from local storage
            const base64Data = localStorage.getItem(sessionDetails.token);
            if (!base64Data) {
                console.log("No Excel file found in local storage, downloading from Firebase...");
                await downloadExcelFile(sessionDetails.token); // Download and store it locally
            }

            // Read file from local storage
            const storedFile = localStorage.getItem(sessionDetails.token);
            if (storedFile) {
                const byteCharacters = atob(storedFile.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
                const byteArray = new Uint8Array(byteNumbers);

                const workbook = XLSX.read(byteArray, { type: 'array' });

                console.log("Workbook sheets:", workbook.SheetNames);

                const inventorySheet = workbook.Sheets['INVENTORY']
                    ? XLSX.utils.sheet_to_json(workbook.Sheets['INVENTORY'])
                    : [];

                const cashierSheet = workbook.Sheets['CASHIER']
                    ? XLSX.utils.sheet_to_json(workbook.Sheets['CASHIER'])
                    : [];

                processInventoryData(inventorySheet);
                processSalesData(cashierSheet);
            }
        } catch (error) {
            console.error('Error fetching Excel data:', error);
        }

        setLoading(false);
    };

    const processInventoryData = (data) => {
        const formattedData = data.map(item => ({
            item: item['Item Name'],
            stock: item['Quantity'] || 0
        }));
        setInventoryData(formattedData);
    };

    const processSalesData = (data) => {
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
                <button onClick={() => navigate('/')} className="nav-button pos">POS</button>
                <button onClick={() => navigate('/inventory')} className="nav-button inventory">Inventory</button>
            </div>
          </div>
            <h1 className="title">Sales & Inventory Statistics</h1>
            <button onClick={fetchExcelData}>Refresh Data</button>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <>
                    {/* Daily Sales */}
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

                    {/* Monthly Sales */}
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

                    {/* Yearly Sales */}
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

                    {/* Inventory */}
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

                    {/* Payment Methods */}
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
                </>
            )}
        </div>
    );
};

export default StatisticsPage;
