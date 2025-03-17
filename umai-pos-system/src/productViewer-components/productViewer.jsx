import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
//import { firebase, storage, functions } from "../firebase"; // Uncommented this line
import { collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import "./ProductViewer.css";

function ProductViewer() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    code: "",
    price: "",
    category: "",
    promo: "",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(firebase, "products"));
      const productList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products. Please refresh the page.");
    }
  };

  const handleChange = (e) => {
    if (editing) {
      setEditedProduct({ ...editedProduct, [e.target.name]: e.target.value });
    } else {
      setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
    }
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const uploadImage = async (file) => {
    try {
      const storageRef = ref(storage, `product-images/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Image upload error:", error);
      throw new Error("Failed to upload image. Please try again.");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      if (!newProduct.name || !newProduct.code || !newProduct.price || !newProduct.category) {
        throw new Error("All fields except promo are required");
      }

      if (isNaN(newProduct.price) || parseFloat(newProduct.price) <= 0) {
        throw new Error("Please enter a valid price greater than 0");
      }

      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        imageUrl,
        createdAt: new Date().toISOString()
      };

      const addProduct = httpsCallable(functions, "addProduct");
      const result = await addProduct(productData);

      setProducts((prev) => [...prev, { id: result.data.id, ...productData }]);

      setSaveMessage("Product saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);

      setNewProduct({ name: "", code: "", price: "", category: "", promo: "", imageUrl: "" });
      setImageFile(null);

    } catch (error) {
      console.error("Save error:", error);
      setError(error.message || "Failed to save product");
      setSaveMessage("❌ " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditedProduct = async (e) => {
    e.preventDefault();
    try {
      if (!editedProduct.name || !editedProduct.code || !editedProduct.price || !editedProduct.category) {
        throw new Error("All fields except promo are required");
      }

      const updateProduct = httpsCallable(functions, "updateProduct");
      const result = await updateProduct(editedProduct);

      setProducts((prev) => prev.map((p) => (p.id === editedProduct.id ? result.data : p)));

      setEditing(false);
      setEditedProduct({});
      setSaveMessage("Product updated successfully!");
      setTimeout(() => setSaveMessage(""), 3000);

    } catch (error) {
      console.error("Update error:", error);
      setError(error.message || "Failed to update product");
      setSaveMessage("❌ " + error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const deleteProduct = httpsCallable(functions, "deleteProduct");
        await deleteProduct({ id });
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } catch (error) {
        console.error("Delete error:", error);
        setError("Failed to delete product");
      }
    }
  };

  const handleEditProduct = async (product) => {
    setEditing(true);
    setEditedProduct(product);
  };

  return (
    <div className="product-page">
      <div className="product-header">
        <h1>Product Viewer</h1>
        <div className="nav-buttons">
          <button className="nav-btn green" onClick={() => navigate("/app")}>POS</button>
          <button className="nav-btn blue" onClick={() => navigate("/inventory")}>Inventory</button>
          <button className="nav-btn gray" onClick={() => navigate("/statistics")}>Statistics</button>
        </div>
      </div>

      <div className="product-container">
        <h2>{editing ? "Edit Product" : "Create New Product"}</h2>
        {error && <div className="error-message">{error}</div>}
        {saveMessage && <div className={`save-message ${saveMessage.includes("❌") ? "error" : "success"}`}>{saveMessage}</div>}

        <form className="product-form" onSubmit={editing ? handleSaveEditedProduct : handleAddProduct}>
          <input type="text" name="name" placeholder="Product Name" 
                 value={editing ? editedProduct.name : newProduct.name} 
                 onChange={handleChange} required />

          <input type="text" name="code" placeholder="Product Code" 
                 value={editing ? editedProduct.code : newProduct.code} 
                 onChange={handleChange} required />

          <input type="number" name="price" placeholder="Product Price" 
                 value={editing ? editedProduct.price : newProduct.price} 
                 onChange={handleChange} step="0.01" required />

          <input type="text" name="category" placeholder="Product Category" 
                 value={editing ? editedProduct.category : newProduct.category} 
                 onChange={handleChange} required />

          <input type="text" name="promo" placeholder="(Optional) Promo Bundles" 
                 value={editing ? editedProduct.promo : newProduct.promo} 
                 onChange={handleChange} />

          {editing ? (
            <button type="submit">Save Changes</button>
          ) : (
            <>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save New Product"}
              </button>
            </>
          )}
        </form>

        {/* Tray for Created Products */}
        <div className="product-tray">
          <h3>Created Products</h3>
          {products.length === 0 ? (
            <p>No products created yet.</p>
          ) : (
            <div className="product-cards">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <h4>{product.name}</h4>
                  <p><strong>Code:</strong> {product.code}</p>
                  <p><strong>Price:</strong> ${product.price.toFixed(2)}</p>
                  <p><strong>Category:</strong> {product.category}</p>
                  {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="product-image" />}
                  <div className="product-actions">
                    <button className="edit-btn" onClick={() => handleEditProduct(product)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDeleteProduct(product.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductViewer;