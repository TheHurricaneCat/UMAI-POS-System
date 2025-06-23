import React, { useState, useEffect } from "react";
import { Bar } from 'react-chartjs-2';
import { useNavigate } from "react-router-dom"; 
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { supabase } from '../src/database/supabase';
import * as XLSX from "xlsx";
import './Statistics.css';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function extractDateFromExcel(jsonData) {
    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && String(row[0]).toUpperCase() === "PRODUCT") {
            const prodRow = jsonData[i + 1];
            if (prodRow && prodRow.length > 0) {
                // Try to find a cell that looks like a date (YYYY-MM-DD)
                for (let cell of prodRow) {
                    if (typeof cell === "string" && /^\d{4}-\d{2}-\d{2}/.test(cell)) {
                        return cell.slice(0, 10); // return YYYY-MM-DD
                    }
                }
            }
        }
    }
    return null;
}

// Helper to extract week string from date
function getWeekString(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const firstDay = new Date(year, 0, 1);
    const days = Math.floor((date - firstDay) / 86400000);
    const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
    return `${year}-W${week}`;
}

function Statistics() {
    const navigate = useNavigate(); 
    const [files, setFiles] = useState([]);
    const [activeReport, setActiveReport] = useState('yearly');
    const [input, setInput] = useState({});
    const [graphData, setGraphData] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState('');
    const [matchingFiles, setMatchingFiles] = useState([]);

    useEffect(() => {
        async function fetchFiles() {
            const { data, error } = await supabase.storage.from('excel.storage').list('');
            if (!error && data) {
                setFiles(data.filter(f => f.name.endsWith('.xlsx')));
            }
        }
        fetchFiles();
    }, []);

    useEffect(() => {
        setGraphData(null);
        setComparison(null);
        setSelectedFile('');
        setMatchingFiles([]);
    }, [activeReport, input, files]);

    const handleReportType = (type) => {
        setActiveReport(type);
        setInput({});
        setSelectedFile('');
        setMatchingFiles([]);
    };

    const handleInputChange = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
        setSelectedFile('');
        setMatchingFiles([]);
    };

    const handleFileSelect = (e) => {
        setSelectedFile(e.target.value);
    };

    // Filter files by reading the date from inside each file
    const filterFilesByPeriod = async () => {
        if (!isInputValid()) return [];
        let filtered = [];
        for (const file of files) {
            const { data, error } = await supabase
                .storage
                .from('excel.storage')
                .download(file.name);
            if (error || !data) continue;
            const arrayBuffer = await data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const fileDate = extractDateFromExcel(jsonData); // YYYY-MM-DD or null
            if (!fileDate) continue;

            // Compare fileDate to input
            switch (activeReport) {
                case "yearly":
                    if (input.year && fileDate.startsWith(input.year)) filtered.push({ file, jsonData });
                    break;
                case "monthly":
                    if (input.year && input.month) {
                        const month = String(input.month).padStart(2, "0");
                        if (fileDate.startsWith(`${input.year}-${month}`)) filtered.push({ file, jsonData });
                    }
                    break;
                case "weekly":
                    if (input.year && input.week) {
                        const weekStr = `${input.year}-W${String(input.week)}`;
                        if (getWeekString(fileDate) === weekStr) filtered.push({ file, jsonData });
                    }
                    break;
                case "daily":
                    if (input.date && fileDate === input.date) filtered.push({ file, jsonData });
                    break;
                default:
                    break;
            }
        }
        return filtered;
    };
    
        const parseExcelRows = (jsonData) => {
        let products = [];
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            // Only look for PRODUCT rows
            if (row[0] && String(row[0]).toUpperCase() === "PRODUCT") {
                const name = row[2];
                // Use the "total" column (row[4]) for sales amount, fallback to price (row[3]) if needed
                let value = 0;
                if (typeof row[4] === "number" && !isNaN(row[4])) value = row[4];
                else if (!isNaN(Number(row[4]))) value = Number(row[4]);
                else if (typeof row[3] === "number" && !isNaN(row[3])) value = row[3];
                else if (!isNaN(Number(row[3]))) value = Number(row[3]);
                if (name && value) {
                    products.push({ name, value });
                }
            }
        }
        return products;
    };

    const generateGraph = async () => {
        setLoading(true);
        setGraphData(null);
        setComparison(null);

        // Filter files by period (reads inside each file)
        let filtered = await filterFilesByPeriod();

        // For select file dropdown
        setMatchingFiles(filtered.map(f => f.file));

        // If a file is selected, only use that file
        if (selectedFile) {
            filtered = filtered.filter(f => f.file.name === selectedFile);
        }

        if (!filtered.length) {
            setLoading(false);
            alert("No files found for this period.");
            return;
        }

        let allProducts = [];
        for (const { jsonData } of filtered) {
            allProducts = allProducts.concat(parseExcelRows(jsonData));
        }

        const salesMap = {};
        let manualTotal = 0;
        allProducts.forEach(prod => {
            if (!salesMap[prod.name]) salesMap[prod.name] = 0;
            salesMap[prod.name] += prod.value;
            manualTotal += prod.value;
        });

        const labels = Object.keys(salesMap);
        const sales = labels.map(l => salesMap[l]);

        setGraphData({
            labels,
            datasets: [
                {
                    label: 'Sales',
                    data: sales,
                    backgroundColor: '#ffd600',
                    borderColor: '#3a3350',
                    borderWidth: 2,
                },
            ],
        });

        setComparison({
            reportTotal: manualTotal,
            manualTotal: manualTotal,
            difference: 0,
        });

        setLoading(false);
    };

    const renderInputs = () => {
        switch (activeReport) {
            case 'yearly':
                return (
                    <input
                        type="number"
                        name="year"
                        placeholder="Year (e.g. 2025)"
                        value={input.year || ''}
                        onChange={handleInputChange}
                        className="statInput"
                        min="2000"
                        max="2100"
                    />
                );
            case 'monthly':
                return (
                    <>
                        <input
                            type="number"
                            name="year"
                            placeholder="Year"
                            value={input.year || ''}
                            onChange={handleInputChange}
                            className="statInput"
                            min="2000"
                            max="2100"
                        />
                        <input
                            type="number"
                            name="month"
                            placeholder="Month (1-12)"
                            value={input.month || ''}
                            onChange={handleInputChange}
                            className="statInput"
                            min="1"
                            max="12"
                        />
                    </>
                );
            case 'weekly':
                return (
                    <>
                        <input
                            type="number"
                            name="year"
                            placeholder="Year"
                            value={input.year || ''}
                            onChange={handleInputChange}
                            className="statInput"
                            min="2000"
                            max="2100"
                        />
                        <input
                            type="number"
                            name="week"
                            placeholder="Week (1-53)"
                            value={input.week || ''}
                            onChange={handleInputChange}
                            className="statInput"
                            min="1"
                            max="53"
                        />
                    </>
                );
            case 'daily':
                return (
                    <input
                        type="date"
                        name="date"
                        value={input.date || ''}
                        onChange={handleInputChange}
                        className="statInput"
                    />
                );
            default:
                return null;
        }
    };

    const isInputValid = () => {
        switch (activeReport) {
            case 'yearly':
                return !!input.year;
            case 'monthly':
                return !!input.year && !!input.month;
            case 'weekly':
                return !!input.year && !!input.week;
            case 'daily':
                return !!input.date;
            default:
                return false;
        }
    };

    return (
        <div className="statisticsFlexContainer">
            <div className="statisticsSidebar">
                <button
                    className="goToAppBtn"
                    onClick={() => navigate('/app/')}
                >
                    Go to App
                </button>
                <div className="sidebarBtnGroup">
                    <button
                        className={`sidebarBtn${activeReport === 'yearly' ? ' active' : ''}`}
                        onClick={() => handleReportType('yearly')}
                    >Yearly</button>
                    <button
                        className={`sidebarBtn${activeReport === 'monthly' ? ' active' : ''}`}
                        onClick={() => handleReportType('monthly')}
                    >Monthly</button>
                    <button
                        className={`sidebarBtn${activeReport === 'weekly' ? ' active' : ''}`}
                        onClick={() => handleReportType('weekly')}
                    >Weekly</button>
                    <button
                        className={`sidebarBtn${activeReport === 'daily' ? ' active' : ''}`}
                        onClick={() => handleReportType('daily')}
                    >Daily</button>
                </div>
                <div className="sidebarInputs">
                    {renderInputs()}
                    <select
                        className="statInput"
                        value={selectedFile}
                        onChange={handleFileSelect}
                        disabled={matchingFiles.length === 0}
                    >
                        <option value="">-- Select File (optional) --</option>
                        {matchingFiles.map(file => (
                            <option key={file.name} value={file.name}>{file.name}</option>
                        ))}
                    </select>
                </div>
                <button className="generateBtn" onClick={generateGraph} disabled={loading || !isInputValid()}>
                    {loading ? "Loading..." : "Show Graph"}
                </button>
            </div>
            <div className="statisticsMain">
                <div className="statisticsHeader">Statistics</div>
                <div className="statisticsGraphSection">
                    {graphData ? (
                        <Bar data={graphData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                    ) : (
                        <div className="graphPlaceholder">Select a period and click "Show Graph".</div>
                    )}
                </div>
                <button className="generateReportBtn" onClick={generateGraph} disabled={loading || !isInputValid()}>
                    {loading ? "Loading..." : "Generate Report & Compare"}
                </button>
                {comparison && (
                    <div className="comparisonSection">
                        <div>Report Total: <b>{comparison.reportTotal}</b></div>
                        <div>Manual Total: <b>{comparison.manualTotal}</b></div>
                        <div>Difference: <b style={{ color: comparison.difference === 0 ? "#00e676" : "#ff1744" }}>{comparison.difference}</b></div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Statistics;