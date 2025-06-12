import React, { forwardRef } from 'react';
import styles from './ReceiptTemplate.module.css';

const ReceiptTemplate = forwardRef(({ orderData, discount }, ref) => {
  const currentDate = new Date().toLocaleString();
  const totalBeforeDiscount = orderData.products.reduce((sum, product) => 
    sum + (product.price * product.quantity), 0);
  const discountAmount = totalBeforeDiscount * (discount?.value || 0);
  const finalTotal = totalBeforeDiscount - discountAmount;

  return (
    <div className={styles.receipt} ref={ref}>
      <div className={styles.receiptHeader}>
        <h2>RESTAURANT NAME</h2>
        <p>123 Main Street, City</p>
        <p>Tel: (123) 456-7890</p>
        <p>VAT Reg: 123-456-789</p>
      </div>

      <div className={styles.receiptInfo}>
        <p><strong>Order #:</strong> {orderData.id}</p>
        <p><strong>Date:</strong> {currentDate}</p>
        <p><strong>Cashier:</strong> {orderData.cashier || 'Staff'}</p>
        {orderData.customer && (
          <p><strong>Customer:</strong> {orderData.customer.customerName}</p>
        )}
      </div>

      <div className={styles.receiptItems}>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orderData.products.map((product, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td>{product.name}</td>
                  <td>{product.quantity}</td>
                  <td>₱{product.price.toFixed(2)}</td>
                  <td>₱{(product.price * product.quantity).toFixed(2)}</td>
                </tr>
                {product.modifiers && product.modifiers.map((modifier, idx) => (
                  <tr key={`mod-${idx}`} className={styles.modifierRow}>
                    <td colSpan="2"> - {modifier.name}</td>
                    <td>₱{modifier.price.toFixed(2)}</td>
                    <td>₱{(modifier.price * modifier.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.receiptSummary}>
        <div className={styles.summaryRow}>
          <span>Subtotal:</span>
          <span>₱{totalBeforeDiscount.toFixed(2)}</span>
        </div>
        {discount && discount.value > 0 && (
          <div className={styles.summaryRow}>
            <span>{discount.name} Discount ({(discount.value * 100).toFixed(0)}%):</span>
            <span>-₱{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className={`${styles.summaryRow} ${styles.total}`}>
          <span>TOTAL:</span>
          <span>₱{finalTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.receiptFooter}>
        <p>Thank you for your purchase!</p>
        <p>Please come again</p>
      </div>
    </div>
  );
});

export default ReceiptTemplate;