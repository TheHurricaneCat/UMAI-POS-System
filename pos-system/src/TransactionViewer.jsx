import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, voidLastTransaction } from './handlers/DataHandler';
import PopUp from './global-components/PopUp';
import './TransactionViewer.css';

const TransactionViewer = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voidPopup, setVoidPopup] = useState(false);
  const [messagePopup, setMessagePopup] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [hasVoidedRecently, setHasVoidedRecently] = useState(false);
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const transactionData = await getTransactions();
      setTransactions(transactionData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load transactions');
      setLoading(false);
      console.error('Error loading transactions:', err);
    }
  };

  const handleVoidLastTransaction = () => {
    if (hasVoidedRecently) {
      setMessageText('You can only void one transaction until a new transaction is added.');
      setMessagePopup(true);
      return;
    }

    if (transactions.length === 0) {
      setMessageText('No transactions available to void.');
      setMessagePopup(true);
      return;
    }

    setVoidPopup(true);
  };

  const handleConfirmVoid = () => {
    setVoidPopup(false);
    performVoidTransaction();
  };

  const handleCancelVoid = () => {
    setVoidPopup(false);
  };

  const performVoidTransaction = async () => {
    setLoading(true);
    
    try {
      const success = await voidLastTransaction();
      if (success) {
        setMessageText('Last transaction has been successfully voided.');
        setHasVoidedRecently(true);
        await loadTransactions(); // Reload transactions after voiding
        setExpandedTransactionId(null); // Close any expanded transaction
      } else {
        setMessageText('Failed to void the last transaction. Please try again.');
      }
    } catch (err) {
      setMessageText('An error occurred while voiding the transaction.');
      console.error('Error voiding transaction:', err);
    }
    
    setLoading(false);
    setMessagePopup(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (invoiceNumber) => {
    if (!invoiceNumber || typeof invoiceNumber !== 'string') return 'N/A';
    
    const parts = invoiceNumber.split('-');
    if (parts.length < 3) return 'N/A';
    
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  };

  const handleRedirect = (path) => {
    navigate(path);
  };

  const toggleTransactionDetails = (invoiceNumber) => {
    if (expandedTransactionId === invoiceNumber) {
      setExpandedTransactionId(null); // Collapse if already expanded
    } else {
      setExpandedTransactionId(invoiceNumber); // Expand this transaction
    }
  };

  return (
    <div className="tx-primary-interface">
      <div className="tx-navigation-viewer">
        <div className="tx-header-buttons">
          <button className="header-button session-start" onClick={() => handleRedirect('/app')}>
            Go to App
          </button>
          <button className="header-button inventory" onClick={() => handleRedirect('/session-viewer')}>
            Session Viewer
          </button>
          <button className="header-button statistics" onClick={() => handleRedirect('/product-manager')}>
            Product Manager
          </button>
          <button 
            className="header-button session-end" 
            onClick={handleVoidLastTransaction}
            disabled={loading || transactions.length === 0 || hasVoidedRecently}
          >
            Void Last Transaction
          </button>
        </div>
      </div>

      <div className="tx-content-interface">
        <h1 className="tx-page-title">Transaction History</h1>

        {loading ? (
          <div className="tx-loading">Loading transactions...</div>
        ) : error ? (
          <div className="tx-error">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="tx-no-data">No transactions found</div>
        ) : (
          <div className="tx-accordion">
            {transactions.map(transaction => (
              <div key={transaction.invoiceNumber} className="tx-item">
                <div 
                  className={`tx-header ${expandedTransactionId === transaction.invoiceNumber ? 'expanded' : ''}`}
                  onClick={() => toggleTransactionDetails(transaction.invoiceNumber)}
                >
                  <div className="tx-summary">
                    <span className="tx-invoice">{transaction.invoiceNumber}</span>
                    <span className="tx-date">{formatDate(transaction.invoiceNumber)}</span>
                    <span className="tx-customer">{transaction.customerName}</span>
                    <span className="tx-payment">{transaction.paymentMethod}</span>
                    <span className="tx-count">{transaction.products.length} items</span>
                    <span className="tx-amount">
                      {transaction.discountedTotal 
                        ? formatCurrency(transaction.discountedTotal) 
                        : formatCurrency(transaction.total)}
                    </span>
                    <span className="tx-cashier">{transaction.cashierName}</span>
                  </div>
                  <span className={`tx-arrow ${expandedTransactionId === transaction.invoiceNumber ? 'expanded' : ''}`}>▼</span>
                </div>
                
                {expandedTransactionId === transaction.invoiceNumber && (
                  <div className="tx-details">
                    <div className="tx-products">
                      <h3>Products</h3>
                      <table className="tx-products-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transaction.products.map((product, index) => (
                            <React.Fragment key={index}>
                              <tr className="product-row">
                                <td>{product.name}</td>
                                <td>{product.quantity}</td>
                                <td>{formatCurrency(product.price)}</td>
                                <td>{formatCurrency(product.total)}</td>
                              </tr>
                              
                              {product.modifiers.length > 0 && product.modifiers.map((modifier, modIndex) => (
                                <tr key={`mod-${index}-${modIndex}`} className="modifier-row">
                                  <td>└ {modifier.name} (Modifier)</td>
                                  <td>{modifier.quantity}</td>
                                  <td>{formatCurrency(modifier.price)}</td>
                                  <td>{formatCurrency(modifier.total)}</td>
                                </tr>
                              ))}
                              
                              {product.content.length > 0 && product.content.map((content, contIndex) => (
                                <tr key={`cont-${index}-${contIndex}`} className="promo-row">
                                  <td>└ {content.name} (Promo Item)</td>
                                  <td>{content.quantity}</td>
                                  <td>{formatCurrency(content.price)}</td>
                                  <td>{formatCurrency(content.total)}</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="3" className="total-label">Total</td>
                            <td className="total-amount">{formatCurrency(transaction.total)}</td>
                          </tr>
                          {transaction.discountedTotal && (
                            <>
                              <tr>
                                <td colSpan="3" className="discount-label">
                                  Discount ({transaction.discount?.name})
                                </td>
                                <td className="discount-amount">
                                  {formatCurrency(transaction.total - transaction.discountedTotal)}
                                </td>
                              </tr>
                              <tr>
                                <td colSpan="3" className="final-label">Final Total</td>
                                <td className="final-amount">{formatCurrency(transaction.discountedTotal)}</td>
                              </tr>
                            </>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PopUp 
        text="Are you sure you want to void the last transaction? This action cannot be undone."
        button1="Confirm"
        button2="Cancel"
        trigger={voidPopup}
        setTrigger={setVoidPopup}
        onButton1Click={handleConfirmVoid}
        onButton2Click={handleCancelVoid}
      />

      <PopUp 
        text={messageText}
        button1="OK"
        trigger={messagePopup}
        setTrigger={setMessagePopup}
      />
    </div>
  );
};

export default TransactionViewer;

