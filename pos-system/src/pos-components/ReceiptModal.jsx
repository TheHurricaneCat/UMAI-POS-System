import React, { useRef } from 'react';
import ReceiptTemplate from './ReceiptTemplate';
import styles from './ReceiptModal.module.css';

function ReceiptModal({ isOpen, onClose, orderData, discount }) {
  const receiptRef = useRef();

  const handleDownloadPDF = async () => {
    const receipt = receiptRef.current;
    const canvas = await html2canvas(receipt, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Receipt-sized format
    });
    
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`Receipt-Order-${orderData.id}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Receipt Preview</h2>
        </div>
        
        <div className={styles.receiptContainer}>
          <ReceiptTemplate 
            ref={receiptRef} 
            orderData={orderData} 
            discount={discount} 
          />
        </div>
        
        <div className={styles.modalActions}>
          <button className={styles.downloadButton} onClick={handleDownloadPDF}>
            Download PDF
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;