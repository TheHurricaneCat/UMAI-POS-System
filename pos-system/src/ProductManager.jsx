import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './database/supabase.js';
import './ProductManager.css';
import { fetchProductCatalog } from './handlers/SessionHandler.js';

const ProductManager = () => {
    const navigate = useNavigate();
    const [imageStatus, setImageStatus] = useState({});
    const [products, setProducts] = useState([]);
    const [modifiers, setModifiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(null); // 'product' or 'modifier'
    const [editData, setEditData] = useState(null); // Data for the product/modifier being edited or added

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const [refreshing, setRefreshing] = useState(false);

    const handleRedirect = () => {
        navigate('/app');
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const catalog = await fetchProductCatalog();
            if (catalog && Array.isArray(catalog) && catalog.length >= 2) {
                setProducts(catalog[0] || []);
                setModifiers(catalog[1] || []);
            } else {
                console.log("Catalog data not in expected format:", catalog);
                setProducts([]);
                setModifiers([]);
            }
        } catch (error) {
            console.error("Error loading product catalog:", error);
            setProducts([]);
            setModifiers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setImageStatus({}); // Clear image status to force reload
        await loadData();
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (products && products.length > 0) {
            products.forEach(product => {
                checkForImage(product);
            });
        }
    }, [products]);

    const checkForImage = async (product) => {
        try {
            if (!product || !product.code) return false;

            const imageName = `${product.code}.jpg`;
            
            //fetch listing of all objects in the bucket
            const { data, error } = await supabase
                    .storage
                    .from(import.meta.env.VITE_SUPABASE_IMAGE_STORAGE_BUCKET)
                    .list('', {
                        limit: 100,
                        offset: 0,
                        sortBy: { column: 'name', order: 'asc' },
                    });
            
            if (error) {
                console.error('Error listing files:', error);
                setImageUrl(defaultImage);
                return;
            }
            //check if the image exists from the fetched listing
            const fileExists = data.some(file => file.name === imageName);
                
            if (fileExists) {
                console.log(`Image found for ${product.code}`);
                setImageStatus(prev => ({
                    ...prev,
                    [product.code]: 'Available' 
                }));
                return true;
            } else {
                setImageStatus(prev => ({
                    ...prev,
                    [product.code]: 'Missing'
                }));
                return false;
            }
        } catch (error) {
            console.error('Error checking image:', error);
            setImageStatus(prev => ({
                ...prev,
                [product.code]: 'Error'
            }));
            return false;
        }
    };

    const openDeleteConfirm = (type, item) => {
        setItemToDelete({ type, item });
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setItemToDelete(null);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        
        try {
            const { type, item } = itemToDelete;
            const { code, name } = item;
            
            // Delete from Supabase
            const { error } = await supabase
                .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
                .delete()
                .eq('code', code);
            
            if (error) throw error;
            
            // If it's a product, also delete the image if it exists
            if (type === 'product' && imageStatus[code] === 'Available') {
                const { error: storageError } = await supabase.storage
                    .from(import.meta.env.VITE_SUPABASE_IMAGE_STORAGE_BUCKET)
                    .remove([`${code}.jpg`]);
                
                if (storageError) {
                    console.error('Error deleting image:', storageError);
                    // Continue anyway as the product was deleted
                }
            }
            
            // Update state
            if (type === 'product') {
                setProducts((prev) => prev.filter((p) => p.code !== code));
                // Also remove image status
                setImageStatus((prev) => {
                    const newStatus = { ...prev };
                    delete newStatus[code];
                    return newStatus;
                });
            } else {
                setModifiers((prev) => prev.filter((m) => m.code !== code));
            }
            
            closeDeleteConfirm();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item. Please try again.');
        }
    };

    const openModal = (type, item = null) => {
        setModalType(type);
        setEditData(item || { name: '', code: '', price: '', category: '', type });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditData(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;
        setEditData((prev) => ({
            ...prev,
            [name]: type === 'file' ? files[0] : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Keep code within productData, only extract image separately
            const { image, ...productData } = editData; 

            // First check if this product code already exists
            const { data: existingProduct, error: checkError } = await supabase
                .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
                .select('*')
                .eq('code', productData.code)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
                throw checkError;
            }

            if (existingProduct) {
                // Update existing product/modifier
                console.log('[PRODUCT MANAGER] Editing existing item');
                const { error } = await supabase
                    .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
                    .update(productData)
                    .eq('code', productData.code);
                
                if (error) throw error;

                if (productData.type === 'product') {
                    setProducts((prev) =>
                        prev.map((item) => (item.code === productData.code ? { ...item, ...productData } : item))
                    );
                } else {
                    setModifiers((prev) =>
                        prev.map((item) => (item.code === productData.code ? { ...item, ...productData } : item))
                    );
                }
            } else {
                // Add new product/modifier
                console.log('[PRODUCT MANAGER] Adding new item');
                const { data: newData, error } = await supabase
                    .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
                    .insert([productData]) // Include type
                    .select();
                
                if (error) throw error;

                if (productData.type === 'product') {
                    setProducts((prev) => [...prev, newData[0]]);
                } else {
                    setModifiers((prev) => [...prev, newData[0]]);
                }
            }
            
            // Handle image upload if present
            if (image && productData.type === 'product') {
                console.log(`Uploading image for product code: ${productData.code}`);
                const filePath = `${productData.code}.jpg`;
                
                const { error: uploadError } = await supabase.storage
                    .from(import.meta.env.VITE_SUPABASE_IMAGE_STORAGE_BUCKET)
                    .upload(filePath, image, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('Image upload error:', uploadError);
                    alert('Product saved but image upload failed');
                } else {
                    // Refresh image status for this product
                    checkForImage(productData);
                }
            }

            closeModal();
        } catch (error) {
            console.error('Error in submission:', error);
            alert(`An error occurred: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="primaryContainer">
            <h1>Product Catalog Manager</h1>
            <div className="button-row">
                <button className="add-btn" onClick={() => openModal('product')}>Add Product</button>
                <button className="add-btn" onClick={() => openModal('modifier')}>Add Modifier</button>
                <button className="redirect-btn" onClick={handleRedirect}>Go to App</button>
                <button 
                    className="refresh-btn" 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>
            {loading ? (
                <div className="loading-indicator">Loading product data...</div>
            ) : (
                <div className="tableContainer">
                    <div>
                        <h2>Products {products.length > 0 ? `(${products.length})` : '(No products found)'}</h2>
                        <table className="productTable">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Product Code</th>
                                    <th>Price</th>
                                    <th>Category</th>
                                    <th>Image Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr key={index}>
                                        <td>{product.name}</td>
                                        <td>{product.code}</td>
                                        <td>{product.price}</td>
                                        <td>{product.category}</td>
                                        <td>
                                            {imageStatus[product.code] === 'Available' ? (
                                                <span style={{ color: 'green' }}> Uploaded </span>
                                            ) : imageStatus[product.code] === 'Missing' ? (
                                                <span style={{ color: 'red' }}> N/A </span>
                                            ) : imageStatus[product.code] === 'Error' ? (
                                                <span style={{ color: 'orange' }}>!</span>
                                            ) : (
                                                <span>Loading...</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="edit-btn"
                                                onClick={() => openModal('product', product)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                    className="delete-btn"
                                                    onClick={() => openDeleteConfirm('product', product)}
                                                >
                                                    Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h2>Modifiers {modifiers.length > 0 ? `(${modifiers.length})` : '(No modifiers found)'}</h2>
                        <table className="productTable">
                            <thead>
                                <tr>
                                    <th>Modifier Name</th>
                                    <th>Modifier Code</th>
                                    <th>Price</th>
                                    <th>Category</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modifiers.map((modifier, index) => (
                                    <tr key={index}>
                                        <td>{modifier.name}</td>
                                        <td>{modifier.code}</td>
                                        <td>{modifier.price}</td>
                                        <td>{modifier.category}</td>
                                        <td>
                                            <button
                                                className="edit-btn"
                                                onClick={() => openModal('modifier', modifier)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                    className="delete-btn"
                                                    onClick={() => openDeleteConfirm('modifier', modifier)}
                                                >
                                                    Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modalOverlay" onClick={closeModal}>
                    <div className="modalContent" onClick={(e) => e.stopPropagation()}>
                        <h3>{editData.id ? 'Edit' : 'Add'} {modalType === 'product' ? 'Product' : 'Modifier'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="formGroup">
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={editData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="formGroup">
                                <label htmlFor="code">Code</label>
                                <input
                                    type="text"
                                    id="code"
                                    name="code"
                                    value={editData.code}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="formGroup">
                                <label htmlFor="price">Price</label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    value={editData.price}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="formGroup">
                                <label htmlFor="category">Category</label>
                                <input
                                    type="text"
                                    id="category"
                                    name="category"
                                    value={editData.category}
                                    onChange={handleInputChange}
                                />
                            </div>
                            {modalType === 'product' && !editData.id && (
                                <div className="formGroup">
                                    <label htmlFor="image">Image</label>
                                    <input
                                        type="file"
                                        id="image"
                                        name="image"
                                        accept="image/*"
                                        onChange={handleInputChange}
                                    />
                                </div>
                            )}
                            <div className="buttonGroup">
                                <button type="submit" className="saveButton">Save</button>
                                <button type="button" className="cancelButton" onClick={closeModal}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        {showDeleteConfirm && itemToDelete && (
                <div className="modalOverlay" onClick={closeDeleteConfirm}>
                    <div className="modalContent deleteConfirm" onClick={(e) => e.stopPropagation()}>
                        <h2>Confirm Delete</h2>
                        <p>Are you sure you want to delete this {itemToDelete.type}:</p>
                        <p><strong>{itemToDelete.item.name}</strong> ({itemToDelete.item.code})?</p>
                        <p className="warning">This action cannot be undone.</p>
                        <div className="buttonGroup">
                            <button type="button" className="deleteButton" onClick={handleDelete}>
                                Delete
                            </button>
                            <button type="button" className="cancelButton" onClick={closeDeleteConfirm}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManager;