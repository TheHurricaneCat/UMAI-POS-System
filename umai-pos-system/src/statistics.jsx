import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import firebaseApp from "../firebase"; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import './statistics.css';

const COLORS = ['#3498db', '#f1c40f', '#8e44ad'];

const SalesChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" />
        </LineChart>
    </ResponsiveContainer>
);

const InventoryChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="item" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="stock" stroke="#82ca9d" />
        </LineChart>
    </ResponsiveContainer>
);

const PaymentModeChart = ({ data }) => (
    <PieChart width={200} height={200}>
        <Pie data={data} dataKey="value" outerRadius={80} label>
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
        </Pie>
        <Tooltip />
    </PieChart>
);

const StatisticsPage = () => {
    const [salesData, setSalesData] = useState([]);
    const [inventoryData, setInventoryData] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [timeframe, setTimeframe] = useState('monthly');
    const [paymentData, setPaymentData] = useState([
        { name: 'Cash', value: 65 },
        { name: 'E-Wallet', value: 20 },
        { name: 'Card', value: 15 },
    ]);
    
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const db = getDatabase(firebaseApp); 
        const salesRef = ref(db, 'sales');
        const inventoryRef = ref(db, 'inventory');

        try {
            const salesSnapshot = await get(salesRef);
            const inventorySnapshot = await get(inventoryRef);

            if (salesSnapshot.exists()) {
                const salesArray = Object.values(salesSnapshot.val());
                setSalesData(processData(salesArray));
            }
            if (inventorySnapshot.exists()) {
                const inventoryArray = Object.values(inventorySnapshot.val());
                setInventoryData(processInventoryData(inventoryArray));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const processData = (data) => {
        return data.map((item) => ({
            date: item.date,
            amount: item.amount || 0,
        }));
    };

    const processInventoryData = (data) => {
        return data.map((item) => ({
            item: item.name,
            stock: item.stock || 0,
        }));
    };

    const filterSalesData = (timeframe) => {
        setTimeframe(timeframe);
        const filtered = salesData.filter((item) => {
            return item; 
        });
        setFilteredSales(filtered);
    };

    return (
        <div className="statistics-container">
            <h1 className="title">Sales & Inventory Statistics</h1>
            <div className="button-group">
                <button onClick={() => filterSalesData('daily')}>Daily</button>
                <button onClick={() => filterSalesData('weekly')}>Weekly</button>
                <button onClick={() => filterSalesData('monthly')}>Monthly</button>
                <button onClick={() => filterSalesData('quarterly')}>Quarterly</button>
            </div>

            <div className="charts-container">
                <div className="chart-box">
                    <h2>Sales Data</h2>
                    <SalesChart data={filteredSales} />
                </div>
                <div className="chart-box">
                    <h2>Inventory Status</h2>
                    <InventoryChart data={inventoryData} />
                </div>
                <div className="chart-box payment-box">
                    <h2>Mode of Payment</h2>
                    <PaymentModeChart data={paymentData} />
                    <ul className="legend">
                        <li><span className="cash"></span> Cash - 65%</li>
                        <li><span className="ewallet"></span> E-Wallet - 20%</li>
                        <li><span className="card"></span> Card - 15%</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;
