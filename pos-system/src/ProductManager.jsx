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
    const [ingredients, setIngredients] = useState([]); // New state for ingredients
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(null); // 'product', 'modifier', or 'ingredient'
    const [editData, setEditData] = useState(null);

    // Search states
    const [productSearch, setProductSearch] = useState('');
    const [modifierSearch, setModifierSearch] = useState('');
    const [ingredientSearch, setIngredientSearch] = useState(''); // New search state

    // Filtered products and modifiers
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) || 
        product.code.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(productSearch.toLowerCase()))
    );

    const filteredModifiers = modifiers.filter(modifier => 
        modifier.name.toLowerCase().includes(modifierSearch.toLowerCase()) || 
        modifier.code.toLowerCase().includes(modifierSearch.toLowerCase()) ||
        (modifier.category && modifier.category.toLowerCase().includes(modifierSearch.toLowerCase()))
    );

    // Filtered ingredients
    const filteredIngredients = ingredients.filter(ingredient => 
        ingredient.name.toLowerCase().includes(ingredientSearch.toLowerCase()) || 
        ingredient.code.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
        (ingredient.category && ingredient.category.toLowerCase().includes(ingredientSearch.toLowerCase()))
    );

    // State for bundle product selection and ingredient selection
    const [selectedBundleProducts, setSelectedBundleProducts] = useState([]);
    const [selectedIngredients, setSelectedIngredients] = useState([]); // New state for ingredient selection with quantities
    const [showProductSelector, setShowProductSelector] = useState(false);
    const [showIngredientSelector, setShowIngredientSelector] = useState(false); // New state

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
            if (catalog && Array.isArray(catalog) && catalog.length >= 3) {
                setProducts(catalog[0] || []);
                setModifiers(catalog[1] || []);
                setIngredients(catalog[2] || []);
            } else {
                console.log("Catalog data not in expected format:", catalog);
                setProducts([]);
                setModifiers([]);
                setIngredients([]);
            }
        } catch (error) {
            console.error("Error loading product catalog:", error);
            setProducts([]);
            setModifiers([]);
            setIngredients([]);
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
        if (item) {
            setEditData({ ...item });
            // Initialize selected ingredients for products with quantities
            if (item.ingredients && type === 'product') {
                const ingredientEntries = item.ingredients.split(',').filter(entry => entry.trim());
                const ingredientsWithQty = ingredientEntries.map(entry => {
                    const [qty, code] = entry.trim().split('/');
                    return { code, quantity: qty || '1' };
                });
                setSelectedIngredients(ingredientsWithQty);
            } else {
                setSelectedIngredients([]);
            }
            // Initialize bundle products for existing bundles
            if (item.content && (item.category === 'Bundle' || item.category === 'Promo')) {
                setSelectedBundleProducts(item.content.split(',').filter(code => code.trim()));
            } else {
                setSelectedBundleProducts([]);
            }
        } else {
            setEditData({ name: '', code: '', price: '', category: '', type });
            setSelectedIngredients([]);
            setSelectedBundleProducts([]);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditData(null);
        setSelectedIngredients([]);
        setSelectedBundleProducts([]);
    };

    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;
        
        // Special handling for category - show/hide bundle content field
        if (name === 'category') {
            const isBundle = value === 'Promo' || value === 'Bundle';
            
            // Initialize content field if switching to bundle category
            if (isBundle && !editData.content) {
                setEditData(prev => ({
                    ...prev,
                    [name]: value,
                    content: ''
                }));
            } else {
                setEditData(prev => ({
                    ...prev,
                    [name]: value
                }));
            }
            
            // When switching away from bundle category, clear content
            if (!isBundle && editData.content) {
                setEditData(prev => ({
                    ...prev,
                    [name]: value,
                    content: undefined
                }));
                setSelectedBundleProducts([]);
            }
        } else {
            setEditData((prev) => ({
                ...prev,
                [name]: type === 'file' ? files[0] : value
            }));
        }
    };

    // Handle bundle product selection
    const toggleProductSelection = (code) => {
        setSelectedBundleProducts(prev => {
            if (prev.includes(code)) {
                // Remove product if already selected
                const newSelection = prev.filter(item => item !== code);
                
                // Also update editData content
                setEditData(prevData => ({
                    ...prevData,
                    content: newSelection.join(',')
                }));
                
                return newSelection;
            } else {
                // Add product if not selected
                const newSelection = [...prev, code];
                
                // Also update editData content
                setEditData(prevData => ({
                    ...prevData,
                    content: newSelection.join(',')
                }));
                
                return newSelection;
            }
        });
    };

    // Open product selector modal for bundle
    const openProductSelector = () => {
        // Initialize selectedProducts from content if it exists
        if (editData.content) {
            const productCodes = editData.content.split(',');
            setSelectedBundleProducts(productCodes);
        } else {
            setSelectedBundleProducts([]);
        }
        setShowProductSelector(true);
    };

    // Close product selector modal
    const closeProductSelector = () => {
        setShowProductSelector(false);
    };

    // Handle editing bundle content directly
    const handleContentChange = (e) => {
        const { value } = e.target;
        setEditData(prev => ({
            ...prev,
            content: value
        }));
        
        // Also update selectedBundleProducts if the content was changed manually
        if (value) {
            setSelectedBundleProducts(value.split(','));
        } else {
            setSelectedBundleProducts([]);
        }
    };

    // Add a specific function to open bundle creation modal
    const openBundleModal = () => {
        setModalType('product');
        setEditData({ 
            name: '', 
            code: '', 
            price: '', 
            category: 'Bundle', 
            type: 'product',
            content: ''
        });
        setSelectedBundleProducts([]);
        setShowModal(true);
    };

    // Add a specific function to open ingredient creation modal
    const openIngredientModal = () => {
        setModalType('ingredient');
        setEditData({ 
            name: '', 
            code: '', 
            price: '', 
            category: 'Ingredient', 
            type: 'ingredient'
        });
        setSelectedIngredients([]);
        setSelectedBundleProducts([]);
        setShowModal(true);
    };

    // Add a function to add a product directly from dropdown
    const handleAddProductToBundle = (e) => {
        const selectedCode = e.target.value;
        if (!selectedCode) return;
        
        // Prevent adding duplicates
        if (!selectedBundleProducts.includes(selectedCode)) {
            const newSelection = [...selectedBundleProducts, selectedCode];
            setSelectedBundleProducts(newSelection);
            setEditData(prev => ({
                ...prev,
                content: newSelection.join(',')
            }));
        }
        
        // Reset the dropdown to default value
        e.target.value = '';
    };
    
    // Add a function to remove a product from the bundle
    const removeProductFromBundle = (codeToRemove) => {
        const newSelection = selectedBundleProducts.filter(code => code !== codeToRemove);
        setSelectedBundleProducts(newSelection);
        setEditData(prev => ({
            ...prev,
            content: newSelection.join(',')
        }));
    };

    // Handle ingredient selection with quantities
    const toggleIngredientSelection = (code) => {
        setSelectedIngredients(prev => {
            const existingIndex = prev.findIndex(item => item.code === code);
            
            if (existingIndex >= 0) {
                // Remove ingredient if already selected
                const newSelection = prev.filter(item => item.code !== code);
                
                // Update editData ingredients
                const ingredientString = newSelection.map(item => `${item.quantity}/${item.code}`).join(',');
                setEditData(prevData => ({
                    ...prevData,
                    ingredients: ingredientString
                }));
                
                return newSelection;
            } else {
                // Add ingredient if not selected with default quantity of 1
                const newSelection = [...prev, { code, quantity: '1' }];
                
                // Update editData ingredients
                const ingredientString = newSelection.map(item => `${item.quantity}/${item.code}`).join(',');
                setEditData(prevData => ({
                    ...prevData,
                    ingredients: ingredientString
                }));
                
                return newSelection;
            }
        });
    };

    // Update ingredient quantity
    const updateIngredientQuantity = (code, quantity) => {
        setSelectedIngredients(prev => {
            const newSelection = prev.map(item => 
                item.code === code ? { ...item, quantity } : item
            );
            
            // Update editData ingredients
            const ingredientString = newSelection.map(item => `${item.quantity}/${item.code}`).join(',');
            setEditData(prevData => ({
                ...prevData,
                ingredients: ingredientString
            }));
            
            return newSelection;
        });
    };

    // Open ingredient selector modal
    const openIngredientSelector = () => {
        // Initialize selectedIngredients from ingredients field if it exists
        if (editData.ingredients) {
            const ingredientEntries = editData.ingredients.split(',').filter(entry => entry.trim());
            const ingredientsWithQty = ingredientEntries.map(entry => {
                const [qty, code] = entry.trim().split('/');
                return { code, quantity: qty || '1' };
            });
            setSelectedIngredients(ingredientsWithQty);
        } else {
            setSelectedIngredients([]);
        }
        setShowIngredientSelector(true);
    };

    // Close ingredient selector modal
    const closeIngredientSelector = () => {
        setShowIngredientSelector(false);
    };

    // Add ingredient directly from dropdown
    const handleAddIngredientToProduct = (e) => {
        const selectedCode = e.target.value;
        if (!selectedCode) return;
        
        // Prevent adding duplicates
        const existingIngredient = selectedIngredients.find(item => item.code === selectedCode);
        if (!existingIngredient) {
            const newSelection = [...selectedIngredients, { code: selectedCode, quantity: '1' }];
            setSelectedIngredients(newSelection);
            
            const ingredientString = newSelection.map(item => `${item.quantity}/${item.code}`).join(',');
            setEditData(prev => ({
                ...prev,
                ingredients: ingredientString
            }));
        }
        
        // Reset the dropdown to default value
        e.target.value = '';
    };
    
    // Remove ingredient from product
    const removeIngredientFromProduct = (codeToRemove) => {
        const newSelection = selectedIngredients.filter(item => item.code !== codeToRemove);
        setSelectedIngredients(newSelection);
        
        const ingredientString = newSelection.map(item => `${item.quantity}/${item.code}`).join(',');
        setEditData(prev => ({
            ...prev,
            ingredients: ingredientString
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Keep code within productData, only extract image separately
            const { image, ...productData } = editData; 

            // Filter out undefined or null values to prevent database errors
            const cleanProductData = Object.fromEntries(
                Object.entries(productData).filter(([_, value]) => value !== undefined && value !== null)
            );

            // Only include content field if this is a bundle/promo product
            if (cleanProductData.category !== 'Promo' && cleanProductData.category !== 'Bundle') {
                delete cleanProductData.content;
            }

            // Only include ingredients field if this is a product with ingredients
            if (cleanProductData.type !== 'product' || !cleanProductData.ingredients) {
                delete cleanProductData.ingredients;
            }

            console.log('Submitting product data:', cleanProductData);

            // First check if this product code already exists
            const { data: existingProduct, error: checkError } = await supabase
                .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
                .select('*')
                .eq('code', cleanProductData.code)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
                throw checkError;
            }

            if (existingProduct) {
                // Update existing product/modifier/ingredient
                console.log('[PRODUCT MANAGER] Editing existing item');
                const { error } = await supabase
                    .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
                    .update(cleanProductData)
                    .eq('code', cleanProductData.code);
                
                if (error) {
                    console.error('Error updating product:', error);
                    throw error;
                }

                if (cleanProductData.type === 'product') {
                    setProducts((prev) =>
                        prev.map((item) => (item.code === cleanProductData.code ? { ...item, ...cleanProductData } : item))
                    );
                } else if (cleanProductData.type === 'modifier') {
                    setModifiers((prev) =>
                        prev.map((item) => (item.code === cleanProductData.code ? { ...item, ...cleanProductData } : item))
                    );
                } else if (cleanProductData.type === 'ingredient') {
                    setIngredients((prev) =>
                        prev.map((item) => (item.code === cleanProductData.code ? { ...item, ...cleanProductData } : item))
                    );
                }
            } else {
                // Add new product/modifier/ingredient
                console.log('[PRODUCT MANAGER] Adding new item');
                const { data: newData, error } = await supabase
                    .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
                    .insert([cleanProductData])
                    .select();
                
                if (error) {
                    console.error('Error inserting product:', error);
                    throw error;
                }

                if (cleanProductData.type === 'product') {
                    setProducts((prev) => [...prev, newData[0]]);
                } else if (cleanProductData.type === 'modifier') {
                    setModifiers((prev) => [...prev, newData[0]]);
                } else if (cleanProductData.type === 'ingredient') {
                    setIngredients((prev) => [...prev, newData[0]]);
                }
            }
            
            // Handle image upload if present
            if (image && cleanProductData.type === 'product') {
                console.log(`Uploading image for product code: ${cleanProductData.code}`);
                const filePath = `${cleanProductData.code}.jpg`;
                
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
                    checkForImage(cleanProductData);
                }
            }

            closeModal();
        } catch (error) {
            console.error('Error in submission:', error);
            if (error.message.includes('column "content" does not exist')) {
                alert('Error: The database schema is missing the "content" column needed for bundle products. Please update your database schema.');
            } else if (error.message.includes('column "ingredients" does not exist')) {
                alert('Error: The database schema is missing the "ingredients" column needed for product ingredients. Please update your database schema.');
            } else {
                alert(`An error occurred: ${error.message || 'Unknown error'}`);
            }
        }
    };

    return (
        <div className="primaryInterface">
            <div className="navigationViewer">
                <div className="header-buttons">
                    <button className="header-button" onClick={handleRedirect}>Go to App</button>
                    <button 
                        className="header-button statistics" 
                        onClick={handleRefresh} 
                        disabled={refreshing}
                    >
                        {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>
            
            <div className="contentInterface">
                {loading ? (
                    <div className="loading-indicator">Loading product data...</div>
                ) : (
                    <div className="data-container">
                        <div className="section-container">
                            <div className="section-header">
                                <h2>Products {filteredProducts.length > 0 ? `(${filteredProducts.length})` : '(No products found)'}</h2>
                                <div className="section-actions">
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Search products..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                        />
                                        {productSearch && (
                                            <button 
                                                className="clear-search" 
                                                onClick={() => setProductSearch('')}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <div className="action-buttons">
                                        <button className="action-button product" onClick={() => openModal('product')}>Add Product</button>
                                        <button className="action-button bundle" onClick={() => openBundleModal()}>Add Bundle</button>
                                    </div>
                                </div>
                            </div>
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
                                    {filteredProducts.map((product, index) => (
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

                        <div className="section-container">
                            <div className="section-header">
                                <h2>Modifiers {filteredModifiers.length > 0 ? `(${filteredModifiers.length})` : '(No modifiers found)'}</h2>
                                <div className="section-actions">
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Search modifiers..."
                                            value={modifierSearch}
                                            onChange={(e) => setModifierSearch(e.target.value)}
                                        />
                                        {modifierSearch && (
                                            <button 
                                                className="clear-search" 
                                                onClick={() => setModifierSearch('')}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <div className="action-buttons">
                                        <button className="action-button modifier" onClick={() => openModal('modifier')}>Add Modifier</button>
                                    </div>
                                </div>
                            </div>
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
                                    {filteredModifiers.map((modifier, index) => (
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

                        <div className="section-container">
                            <div className="section-header">
                                <h2>Ingredients {filteredIngredients.length > 0 ? `(${filteredIngredients.length})` : '(No ingredients found)'}</h2>
                                <div className="section-actions">
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Search ingredients..."
                                            value={ingredientSearch}
                                            onChange={(e) => setIngredientSearch(e.target.value)}
                                        />
                                        {ingredientSearch && (
                                            <button 
                                                className="clear-search" 
                                                onClick={() => setIngredientSearch('')}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <div className="action-buttons">
                                        <button className="action-button ingredient" onClick={() => openIngredientModal()}>Add Ingredient</button>
                                    </div>
                                </div>
                            </div>
                            <table className="productTable">
                                <thead>
                                    <tr>
                                        <th>Ingredient Name</th>
                                        <th>Ingredient Code</th>
                                        <th>Price</th>
                                        <th>Category</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredIngredients.map((ingredient, index) => (
                                        <tr key={index}>
                                            <td>{ingredient.name}</td>
                                            <td>{ingredient.code}</td>
                                            <td>{ingredient.price}</td>
                                            <td>{ingredient.category}</td>
                                            <td>
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => openModal('ingredient', ingredient)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => openDeleteConfirm('ingredient', ingredient)}
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
            </div>

            {showModal && (
                <div className="modalOverlay" onClick={closeModal}>
                    <div className="modalContent" onClick={(e) => e.stopPropagation()}>
                        <h3>
                            {editData.id ? 'Edit' : 'Add'} 
                            {modalType === 'product' 
                                ? (editData.category === 'Bundle' || editData.category === 'Promo' 
                                    ? ' Bundle/Promo' 
                                    : ' Product') 
                                : modalType === 'modifier' ? ' Modifier' : ' Ingredient'}
                        </h3>
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
                                {modalType === 'ingredient' ? (
                                    <input
                                        type="text"
                                        id="category"
                                        name="category"
                                        value="Ingredient"
                                        readOnly
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        id="category"
                                        name="category"
                                        value={editData.category}
                                        onChange={handleInputChange}
                                    />
                                )}
                            </div>
                            {/* Bundle content field that appears when category is Promo or Bundle */}
                            {modalType === 'product' && 
                             (editData.category === 'Promo' || editData.category === 'Bundle') && (
                                <div className="formGroup bundleGroup">
                                    <label htmlFor="content">Bundle Content</label>
                                    <div className="bundleSelectionGroup">
                                        <select 
                                            className="productDropdown" 
                                            onChange={handleAddProductToBundle}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select products to add...</option>
                                            {products
                                                .filter(p => p.code !== editData.code && 
                                                            !selectedBundleProducts.includes(p.code) &&
                                                            p.category !== 'Promo' && 
                                                            p.category !== 'Bundle')
                                                .map((product) => (
                                                    <option key={product.code} value={product.code}>
                                                        {product.name} ({product.code}) - ${product.price}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        <button 
                                            type="button" 
                                            className="selectProductsButton"
                                            onClick={openProductSelector}
                                        >
                                            View All Products
                                        </button>
                                    </div>
                                    
                                    {selectedBundleProducts.length > 0 ? (
                                        <div className="selectedProductsInfo">
                                            <p>Selected Products: {selectedBundleProducts.length}</p>
                                            <ul className="selectedProductsList">
                                                {selectedBundleProducts.map(code => {
                                                    const product = products.find(p => p.code === code);
                                                    return (
                                                        <li key={code} className="selectedProductItem">
                                                            <span>
                                                                {product ? `${product.name} (${code}) - $${product.price}` : code}
                                                            </span>
                                                            <button 
                                                                type="button" 
                                                                className="removeProductButton"
                                                                onClick={() => removeProductFromBundle(code)}
                                                            >
                                                                ✕
                                                            </button> 
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            <input
                                                type="hidden"
                                                id="content"
                                                name="content"
                                                value={editData.content || ''}
                                            />
                                        </div>
                                    ) : (
                                        <p className="noProductsMessage">No products selected for this bundle.</p>
                                    )}
                                </div>
                            )}
                            {/* Ingredient selection field for products */}
                            {modalType === 'product' && 
                             editData.category !== 'Promo' && editData.category !== 'Bundle' && (
                                <div className="formGroup bundleGroup">
                                    <label htmlFor="ingredients">Product Ingredients</label>
                                    <div className="bundleSelectionGroup">
                                        <select 
                                            className="productDropdown" 
                                            onChange={handleAddIngredientToProduct}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select ingredients to add...</option>
                                            {ingredients
                                                .filter(ingredient => !selectedIngredients.some(item => item.code === ingredient.code))
                                                .map((ingredient) => (
                                                    <option key={ingredient.code} value={ingredient.code}>
                                                        {ingredient.name} ({ingredient.code}) - P{ingredient.price}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        <button 
                                            type="button" 
                                            className="selectProductsButton"
                                            onClick={openIngredientSelector}
                                        >
                                            View All Ingredients
                                        </button>
                                    </div>
                                    
                                    {selectedIngredients.length > 0 ? (
                                        <div className="selectedProductsInfo">
                                            <p>Selected Ingredients: {selectedIngredients.length}</p>
                                            <ul className="selectedProductsList">
                                                {selectedIngredients.map(item => {
                                                    const ingredient = ingredients.find(i => i.code === item.code);
                                                    return (
                                                        <li key={item.code} className="selectedProductItem">
                                                            <div className="ingredientItemContent">
                                                                <span className="ingredientInfo">
                                                                    {ingredient ? `${ingredient.name} (${item.code}) - P${ingredient.price}` : item.code}
                                                                </span>
                                                                <div className="quantityControls">
                                                                    <label>Qty:</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0.01"
                                                                        step="0.01"
                                                                        value={item.quantity}
                                                                        onChange={(e) => updateIngredientQuantity(item.code, e.target.value)}
                                                                        className="quantityInput"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                className="removeProductButton"
                                                                onClick={() => removeIngredientFromProduct(item.code)}
                                                            >
                                                                ✕
                                                            </button> 
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            <input
                                                type="hidden"
                                                id="ingredients"
                                                name="ingredients"
                                                value={editData.ingredients || ''}
                                            />
                                        </div>
                                    ) : (
                                        <p className="noProductsMessage">No ingredients selected for this product.</p>
                                    )}
                                </div>
                            )}
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
            
            {/* Product Selector Modal for Bundle Creation */}
            {showProductSelector && (
                <div className="modalOverlay" onClick={closeProductSelector}>
                    <div className="modalContent productSelectorModal" onClick={(e) => e.stopPropagation()}>
                        <h3>Select Products for Bundle</h3>
                        <div className="productSelectorContainer">
                            {products.filter(p => p.code !== editData.code).map((product) => (
                                <div 
                                    key={product.code} 
                                    className={`productSelectorItem ${selectedBundleProducts.includes(product.code) ? 'selected' : ''}`}
                                    onClick={() => toggleProductSelection(product.code)}
                                >
                                    <div className="productSelectorInfo">
                                        <strong>{product.name}</strong>
                                        <span>({product.code})</span>
                                        <span>${product.price}</span>
                                    </div>
                                    <div className="productSelectorCheckbox">
                                        {selectedBundleProducts.includes(product.code) ? '✓' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="buttonGroup">
                            <button className="doneButton" onClick={closeProductSelector}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingredient Selector Modal */}
            {showIngredientSelector && (
                <div className="modalOverlay" onClick={closeIngredientSelector}>
                    <div className="modalContent productSelectorModal" onClick={(e) => e.stopPropagation()}>
                        <h3>Select Ingredients for Product</h3>
                        <div className="productSelectorContainer">
                            {ingredients.map((ingredient) => {
                                const selectedItem = selectedIngredients.find(item => item.code === ingredient.code);
                                const isSelected = !!selectedItem;
                                
                                return (
                                    <div 
                                        key={ingredient.code} 
                                        className={`productSelectorItem ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleIngredientSelection(ingredient.code)}
                                    >
                                        <div className="productSelectorInfo">
                                            <strong>{ingredient.name}</strong>
                                            <span>({ingredient.code})</span>
                                            <span>P{ingredient.price}</span>
                                            {isSelected && (
                                                <div className="quantityDisplay">
                                                    Qty: {selectedItem.quantity}
                                                </div>
                                            )}
                                        </div>
                                        <div className="productSelectorCheckbox">
                                            {isSelected ? '✓' : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="buttonGroup">
                            <button className="doneButton" onClick={closeIngredientSelector}>Done</button>
                        </div>
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