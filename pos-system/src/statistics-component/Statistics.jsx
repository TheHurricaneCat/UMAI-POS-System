import React, { useState, useEffect, useRef } from "react";
import { Bar } from 'react-chartjs-2';
import { useNavigate } from "react-router-dom"; 
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { supabase } from '../database/supabase';
import * as XLSX from "xlsx";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Statistics.css';
import PopUp from '../global-components/Popup.jsx';
import { getSessionDetails, getUsername } from "../handlers/SessionHandler.js";


Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function extractDateFromExcel(jsonData) {
    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && String(row[0]).toUpperCase() === "PRODUCT") {
            const prodRow = jsonData[i + 1];
            if (prodRow && prodRow.length > 0) {
                for (let cell of prodRow) {
                    if (typeof cell === "string" && /^\d{4}-\d{2}-\d{2}/.test(cell)) {
                        return cell.slice(0, 10);
                    }
                }
            }
        }
    }
    return null;
}

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
    const chartRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [activeReport, setActiveReport] = useState('yearly');
    const [input, setInput] = useState({});
    const [graphData, setGraphData] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState('');
    const [matchingFiles, setMatchingFiles] = useState([]);
    const [username, setUsername] = useState('');
    const [sessionDetails, setSessionDetails] = useState('');
    const [sessionId, setSessionId] = useState('');

    // Popup states
    const [popupTrigger, setPopupTrigger] = useState(false);
    const [popupConfirm, setPopupConfirm] = useState(false);
    const [popupText, setPopupText] = useState("");

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
        async function fetchUsername() {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data?.user) {
                setUsername("Unknown User");
                return;
            }
            // Try to get username from user_metadata
            const user = data.user;
            const uname =
                user.user_metadata?.name ||
                user.user_metadata?.full_name ||
                user.email ||
                "Unknown User";
            setUsername(uname);
        }
        fetchUsername();
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

    // Validate input and show popup if invalid
    const handleShowGraph = async () => {
    let errorMsg = "";
    if (activeReport === "yearly" && !input.year) {
        errorMsg = "Please enter a valid year.";
    } else if (activeReport === "monthly") {
        if (!input.year && !input.month) {
            errorMsg = "Please enter a valid year and month.";
        } else if (!input.year) {
            errorMsg = "Please enter a valid year.";
        } else if (!input.month) {
            errorMsg = "Please enter a valid month.";
        } else if (input.month < 1 || input.month > 12) {
            errorMsg = "Please enter a valid month (1-12).";
        }
    } else if (activeReport === "weekly") {
        if (!input.year && !input.week) {
            errorMsg = "Please enter a valid year and week.";
        } else if (!input.year) {
            errorMsg = "Please enter a valid year.";
        } else if (!input.week) {
            errorMsg = "Please enter a valid week.";
        } else if (input.week < 1 || input.week > 53) {
            errorMsg = "Please enter a valid week (1-53).";
        }
    } else if (activeReport === "daily" && !input.date) {
        errorMsg = "Please enter a valid date.";
    }

    if (errorMsg) {
        setPopupText(errorMsg);
        setPopupTrigger(true);
        return;
    }

    await generateGraph(false);
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
            const fileDate = extractDateFromExcel(jsonData);
            if (!fileDate) continue;

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
            if (row[0] && String(row[0]).toUpperCase() === "PRODUCT") {
                const name = row[2];
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

    // Modified generateGraph to accept a flag
const generateGraph = async (withComparison = true) => {
    setLoading(true);
    setGraphData(null);
    if (withComparison) setComparison(null);

    let filtered = await filterFilesByPeriod();
    setMatchingFiles(filtered.map(f => f.file));

    if (selectedFile) {
        filtered = filtered.filter(f => f.file.name === selectedFile);
    }

    if (!filtered.length) {
        setLoading(false);
        setPopupText("Date not found.");
        setPopupTrigger(true);
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

    if (withComparison) {
        setComparison({
            reportTotal: manualTotal,
            manualTotal: manualTotal,
            difference: 0,
        });
    } else {
        setComparison(null);
    }

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

    const generatePDFReport = () => {
        if (!graphData || !comparison) {
            setPopupText("Please generate a graph first before creating a PDF report.");
            setPopupTrigger(true);
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        // Add "prepared by" with username
        doc.text(
            `Sales Statistics Report`,
            pageWidth / 2,
            20,
            { align: 'center' }
        );

         doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(
            `Prepared by ${username || "Unknown User"}`,
            pageWidth / 2,
            25,
            { align: 'center' }
        );

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        let reportType = activeReport.charAt(0).toUpperCase() + activeReport.slice(1);
        let periodText = '';

        switch (activeReport) {
            case 'yearly':
                periodText = `Year: ${input.year}`;
                break;
            case 'monthly':
                periodText = `Year: ${input.year}, Month: ${input.month}`;
                break;
            case 'weekly':
                periodText = `Year: ${input.year}, Week: ${input.week}`;
                break;
            case 'daily':
                periodText = `Date: ${input.date}`;
                break;
        }

        doc.text(`Report Type: ${reportType}`, 20, 35);
        doc.text(`Period: ${periodText}`, 20, 45);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 55);

        if (selectedFile) {
            doc.text(`File: ${selectedFile}`, 20, 65);
        }

        doc.setFont(undefined, 'bold');
        doc.text('Summary:', 20, 80);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Sales: P${comparison.reportTotal.toFixed(2)}`, 20, 90);
        doc.text(`Number of Products: ${graphData.labels.length}`, 20, 100);

        if (chartRef.current) {
            try {
                const canvas = chartRef.current.canvas;
                const chartImage = canvas.toDataURL('image/png');
                doc.addImage(chartImage, 'PNG', 20, 110, 170, 100);
            } catch (error) {
                console.warn('Could not add chart to PDF:', error);
            }
        }

        const tableData = graphData.labels.map((label, index) => [
            label,
            `P${graphData.datasets[0].data[index].toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 220,
            head: [['Product Name', 'Sales Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [255, 214, 0] },
            styles: { fontSize: 10 }
        });

        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 250;
        doc.setFontSize(10);
        doc.text('This report was generated automatically by the UMAI POS Statistics System.',
            pageWidth / 2, finalY, { align: 'center' });

        // Add page numbers on the right side
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(
                `Page ${i} of ${pageCount}`,
                pageWidth - 20,
                10,
                { align: 'right' }
            );
        }

        const fileName = `${reportType}_Report_${periodText.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        doc.save(fileName);
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
                <button className="generateBtn" onClick={handleShowGraph} disabled={loading}>
                    {loading ? "Loading..." : "Show Graph"}
                </button>
            </div>
            <div className="statisticsMain">
                <div className="statisticsHeader">Statistics</div>
                <div className="statisticsGraphSection">
                    {graphData ? (
                        <Bar 
                            ref={chartRef}
                            data={graphData} 
                            options={{ responsive: true, plugins: { legend: { display: false } } }} 
                        />
                    ) : (
                        <div className="graphPlaceholder">Select a period and click "Show Graph".</div>
                    )}
                </div>
                <div className="reportButtonGroup">
                    <button className="generateReportBtn" onClick={generateGraph} disabled={loading || !isInputValid()}>
                        {loading ? "Loading..." : "Generate Report"}
                    </button>
                    <button 
                        className="pdfReportBtn" 
                        onClick={generatePDFReport} 
                        disabled={!graphData || !comparison}
                    >
                        Download PDF Report
                    </button>
                </div>
                {comparison && (
                    <div className="comparisonSection">
                        <div>Report Total: <b>{comparison.reportTotal}</b></div>
                        <div>Manual Total: <b>{comparison.manualTotal}</b></div>
                        <div>Difference: <b style={{ color: comparison.difference === 0 ? "#00e676" : "#ff1744" }}>{comparison.difference}</b></div>
                    </div>
                )}
            </div>
            {/* Popup for errors and notifications */}
            <PopUp
                text={popupText}
                button1="Confirm"
                button2="Cancel"
                trigger={popupTrigger}
                setTrigger={setPopupTrigger}
                confirm={popupConfirm}
                setConfirm={setPopupConfirm}
            />
        </div>
    );
}

export default Statistics;