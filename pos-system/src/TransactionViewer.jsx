import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, voidLastTransaction } from './handlers/DataHandler';
import PopUp from './global-components/Popup.jsx';
import './TransactionViewer.css';

const TransactionViewer = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voidConfirmPopup, setVoidConfirmPopup] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [messagePopup, setMessagePopup] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [successPopup, setSuccessPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState(false);
  const [hasVoidedRecently, setHasVoidedRecently] = useState(false);
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  // Add effect to handle confirmation
  useEffect(() => {
    if (confirmVoid) {
      performVoidTransaction();
      setConfirmVoid(false);
    }
  }, [confirmVoid]);

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

    // Show confirmation popup
    setVoidConfirmPopup(true);
  };

  const performVoidTransaction = async () => {
    setLoading(true);
    
    try {
      const success = await voidLastTransaction();
      if (success) {
        setHasVoidedRecently(true);
        await loadTransactions(); // Reload transactions after voiding
        setExpandedTransactionId(null); // Close any expanded transaction
        
        // Use success popup instead of message popup
        setSuccessPopup(true);
      } else {
        // Use error popup for failed void operation
        setErrorPopup(true);
      }
    } catch (err) {
      console.error('Error voiding transaction:', err);
      setErrorPopup(true);
    }
    
    setLoading(false);
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
        </div>
      </div>

      <div className="tx-content-interface">
        <div className="tx-page-header">
          <h1 className="tx-page-title">Transaction History</h1>
          <button 
            className="void-btn" 
            onClick={handleVoidLastTransaction}
            disabled={loading || transactions.length === 0 || hasVoidedRecently}
          >
            Void Last Transaction
          </button>
        </div>

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

      {/* Multiple separate PopUps for different scenarios */}
      <PopUp 
        text="Are you sure you want to void the last transaction? This action cannot be undone."
        button1="Confirm"
        button2="Cancel"
        trigger={voidConfirmPopup}
        setTrigger={setVoidConfirmPopup}
        confirm={confirmVoid}
        setConfirm={setConfirmVoid}
      />

      <PopUp 
        text={messageText}
        button1="OK"
        trigger={messagePopup}
        setTrigger={setMessagePopup}
        confirm={false}
        setConfirm={() => {}}
      />

      <PopUp 
        text="Last transaction has been successfully voided."
        button1="OK"
        button2="Close"
        trigger={successPopup}
        setTrigger={setSuccessPopup}
        confirm={false}
        setConfirm={() => {}}
      />

      <PopUp 
        text="Failed to void the last transaction. Please try again."
        button1="OK"
        button2="Close"
        trigger={errorPopup}
        setTrigger={setErrorPopup}
        confirm={false}
        setConfirm={() => {}}
      />
    </div>
  );
};

export default TransactionViewer;

