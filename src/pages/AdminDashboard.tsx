import React, { useState, useEffect, useCallback } from 'react';
import { useShop } from '../context/ShopContext';
import { Product, Order, ProductCategory } from '../types';
import {
  calculateDiscountedPriceFromPercent,
  calculatePercentFromPrices,
  formatPrice,
  getDiscountPercentage,
  getEffectivePrice,
  getNormalizedGallery,
  hasActiveDiscount,
} from '../utils/pricing';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  Truck,
  Layers,
  Lock,
  Upload,
  Star,
  ArrowLeft,
  ArrowRight,
  Percent,
  KeyRound,
  Mail,
  ImagePlus,
  Loader2,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { compressImageFileToDataUrl } from '../utils/imageOptimizer';
import {
  BOOTSTRAPPED_CLOUD_ADMIN_EMAIL,
  deleteProductFromFirestore,
  saveProductToFirestore,
} from '../utils/firestoreCatalog';
import {
  MAX_PRODUCT_GALLERY_IMAGES,
  validateImagePayloadBudget,
} from '../utils/productCatalog';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    refreshProducts,
    cloudCatalog,
    login,
    logout,
    user,
    isCheckingAuth,
    refreshAuth,
    setCurrentPage,
    showToast,
  } = useShop();

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'security'>('products');
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isConnectingCloud, setIsConnectingCloud] = useState(false);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);

  // Admin login states — ALWAYS empty by default (no autofill, no hardcoded credentials)
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Security settings states
  const [securityInfo, setSecurityInfo] = useState<{
    adminEmail: string;
    hasPrivateRecoveryEmail: boolean;
    emailServiceConfigured: boolean;
    emailProvider: string;
  } | null>(null);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);
  const [pwNotice, setPwNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newRecoveryInput, setNewRecoveryInput] = useState('');
  const [recoveryCurrentPassword, setRecoveryCurrentPassword] = useState('');
  const [isUpdatingRecovery, setIsUpdatingRecovery] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Product Add / Edit Modal States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    subtitle: '',
    category: 'watches' as ProductCategory,
    originalPrice: 4000,
    price: 4000,
    discountEnabled: false,
    discountPercentage: 0,
    rating: 5.0,
    reviewsCount: 1,
    images: [] as string[],
    description: '',
    details: 'Manufacture mechanical calibre, Solid precious metal, Serialized caseback',
    composition: '18K Gold, Natural Sapphire',
    sizes: '41mm, 43mm',
    colors: 'Rose Gold: #B76E79, Obsidian Noir: #121214',
    stockCount: 5,
    isNewArrival: true,
    isBestSeller: false,
    isSpecialOffer: false,
  });

  const isAdminAuthenticated = Boolean(user && user.role === 'admin');

  const fetchOrders = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/admin/orders', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAdminOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isAdminAuthenticated]);

  const fetchSecurityInfo = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSecurityInfo(data);
      }
    } catch {
      // ignore
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchOrders();
      fetchSecurityInfo();
    }
  }, [isAdminAuthenticated, fetchOrders, fetchSecurityInfo]);

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    const res = await login(emailInput, passwordInput, true);
    setIsLoggingIn(false);
    if (!res.success) {
      setAuthError(res.error || 'Invalid administrator authorization credentials.');
    } else {
      setEmailInput('');
      setPasswordInput('');
    }
  };

  // Connect Google Account for Permanent Cloud Firestore Catalog Persistence
  const handleConnectCloud = async () => {
    setCloudNotice(null);
    setIsConnectingCloud(true);
    const res = await cloudCatalog.connectGoogleCloud();
    setIsConnectingCloud(false);
    if (!res.success && res.error) {
      setCloudNotice(res.error);
      showToast(res.error, 'error');
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!isAdminAuthenticated) return;
    if (cloudCatalog.seeded && !cloudCatalog.authorized) {
      showToast(
        `Connect Google Cloud Sync (${BOOTSTRAPPED_CLOUD_ADMIN_EMAIL}) first so deletion persists permanently.`,
        'error'
      );
      return;
    }
    if (!window.confirm(`Are you certain you wish to retire "${name}" from the collection?`)) return;

    try {
      let cloudDeleted = false;
      if (cloudCatalog.authorized) {
        await deleteProductFromFirestore(id);
        cloudDeleted = true;
      }

      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok || cloudDeleted) {
        showToast(`Product "${name}" permanently retired.`);
        await refreshProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to delete product.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error during deletion.', 'error');
    }
  };

  // Open Create Product Modal
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setNewImageUrl('');
    setProductForm({
      name: '',
      subtitle: '',
      category: 'watches',
      originalPrice: 4500,
      price: 4500,
      discountEnabled: false,
      discountPercentage: 0,
      rating: 5.0,
      reviewsCount: 1,
      images: ['/src/assets/images/watch_rose_gold_1794494079347.jpg'],
      description: '',
      details: 'Manufacture mechanical calibre, Solid precious metal, Serialized exhibition caseback',
      composition: 'Solid 18K Gold, Natural Sapphire',
      sizes: '41mm',
      colors: 'Gilded: #D4AF37, Noir: #0A0A0C',
      stockCount: 5,
      isNewArrival: true,
      isBestSeller: false,
      isSpecialOffer: false,
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Product Modal
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormError(null);
    setNewImageUrl('');
    const gallery = getNormalizedGallery(p);
    const orig = p.originalPrice && p.originalPrice > 0 ? p.originalPrice : getEffectivePrice(p);
    const discountActive = hasActiveDiscount(p);
    const effPrice = discountActive ? getEffectivePrice(p) : orig;
    const pct = discountActive ? getDiscountPercentage(p) : 0;

    setProductForm({
      name: p.name,
      subtitle: p.subtitle,
      category: p.category,
      originalPrice: orig,
      price: effPrice,
      discountEnabled: discountActive,
      discountPercentage: pct,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      images: gallery.length > 0 ? gallery : [p.image].filter(Boolean),
      description: p.description,
      details: p.details.join(', '),
      composition: p.composition,
      sizes: p.sizes.join(', '),
      colors: p.colors.map((c) => `${c.name}: ${c.hex}`).join(', '),
      stockCount: p.stockCount,
      isNewArrival: !!p.isNewArrival,
      isBestSeller: !!p.isBestSeller,
      isSpecialOffer: !!p.isSpecialOffer,
    });
    setIsAddModalOpen(true);
  };

  // Multi-Image Gallery Actions (Compressed inline for permanent Cloud Firestore persistence)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setFormError(null);

    const remainingSlots = MAX_PRODUCT_GALLERY_IMAGES - productForm.images.length;
    if (remainingSlots <= 0) {
      setFormError(`Maximum ${MAX_PRODUCT_GALLERY_IMAGES} images allowed per product.`);
      e.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files).slice(0, remainingSlots)) {
        if (file.size > 10 * 1024 * 1024) {
          setFormError(`"${file.name}" exceeds the 10MB file limit.`);
          continue;
        }
        try {
          const optimizedDataUrl = await compressImageFileToDataUrl(file);
          uploadedUrls.push(optimizedDataUrl);
        } catch (fileErr: any) {
          setFormError(fileErr?.message || `Failed to optimize "${file.name}".`);
        }
      }

      if (uploadedUrls.length > 0) {
        const nextGallery = Array.from(new Set([...productForm.images, ...uploadedUrls]));
        const budget = validateImagePayloadBudget(nextGallery);
        if (!budget.valid) {
          setFormError(budget.error || 'Gallery exceeds cloud size limit.');
        } else {
          setProductForm((prev) => ({
            ...prev,
            images: nextGallery,
          }));
          showToast(`${uploadedUrls.length} image(s) optimized and added to gallery.`);
        }
      }
    } catch {
      setFormError('Failed to process uploaded image file.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const cleaned = newImageUrl.trim();
    if (!cleaned) return;
    if (productForm.images.includes(cleaned)) {
      setNewImageUrl('');
      return;
    }
    const nextGallery = [...productForm.images, cleaned];
    const budget = validateImagePayloadBudget(nextGallery);
    if (!budget.valid) {
      setFormError(budget.error || 'Cannot add additional image.');
      return;
    }
    setFormError(null);
    setProductForm((prev) => ({
      ...prev,
      images: nextGallery,
    }));
    setNewImageUrl('');
  };

  const handleSetMainImage = (idx: number) => {
    if (idx <= 0 || idx >= productForm.images.length) return;
    setProductForm((prev) => {
      const next = [...prev.images];
      const [chosen] = next.splice(idx, 1);
      next.unshift(chosen);
      return { ...prev, images: next };
    });
  };

  const handleMoveImage = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= productForm.images.length) return;
    setProductForm((prev) => {
      const next = [...prev.images];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, images: next };
    });
  };

  const handleRemoveImage = (idx: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  // Bidirectional Discount Pricing Handlers
  const handleOriginalPriceChange = (val: number) => {
    const orig = Math.max(0, Math.round(val || 0));
    setProductForm((prev) => {
      if (!prev.discountEnabled) {
        return { ...prev, originalPrice: orig, price: orig, discountPercentage: 0 };
      }
      const nextPrice =
        prev.discountPercentage > 0
          ? calculateDiscountedPriceFromPercent(orig, prev.discountPercentage)
          : Math.min(prev.price, Math.max(1, orig - 1));
      const nextPct = calculatePercentFromPrices(orig, nextPrice);
      return {
        ...prev,
        originalPrice: orig,
        price: nextPrice,
        discountPercentage: nextPct,
      };
    });
  };

  const handleToggleDiscount = (enabled: boolean) => {
    setProductForm((prev) => {
      if (!enabled) {
        return {
          ...prev,
          discountEnabled: false,
          price: prev.originalPrice,
          discountPercentage: 0,
        };
      }
      const defaultPct = prev.discountPercentage > 0 && prev.discountPercentage < 100 ? prev.discountPercentage : 10;
      const discounted = calculateDiscountedPriceFromPercent(prev.originalPrice, defaultPct);
      return {
        ...prev,
        discountEnabled: true,
        price: discounted,
        discountPercentage: calculatePercentFromPrices(prev.originalPrice, discounted),
      };
    });
  };

  const handleDiscountedPriceChange = (val: number) => {
    const cleanPrice = Math.max(0, Math.round(val || 0));
    setProductForm((prev) => ({
      ...prev,
      price: cleanPrice,
      discountPercentage: calculatePercentFromPrices(prev.originalPrice, cleanPrice),
    }));
  };

  const handleDiscountPercentageChange = (val: number) => {
    const clampedPct = Math.max(0, Math.min(99, Math.round(val || 0)));
    setProductForm((prev) => ({
      ...prev,
      discountPercentage: clampedPct,
      price:
        clampedPct > 0
          ? calculateDiscountedPriceFromPercent(prev.originalPrice, clampedPct)
          : prev.originalPrice,
    }));
  };

  // Save Product (Add or Edit) to Express + Permanent Cloud Firestore
  const handleSaveProduct = async (e: React.FormEvent, connectCloudFirst = false) => {
    e.preventDefault();
    if (!isAdminAuthenticated) return;
    setFormError(null);

    if (productForm.images.length === 0) {
      setFormError('Please add at least one product image.');
      return;
    }

    const budget = validateImagePayloadBudget(productForm.images);
    if (!budget.valid) {
      setFormError(budget.error || 'Product image gallery exceeds cloud storage limit.');
      return;
    }

    if (productForm.originalPrice <= 0) {
      setFormError('Original price must be greater than $0.');
      return;
    }

    if (productForm.discountEnabled) {
      if (productForm.price <= 0 || productForm.price >= productForm.originalPrice) {
        setFormError('Discounted price must be greater than $0 and strictly less than the Original Price.');
        return;
      }
    }

    let cloudReady = cloudCatalog.authorized;
    if (connectCloudFirst && !cloudReady) {
      setIsConnectingCloud(true);
      const authRes = await cloudCatalog.connectGoogleCloud();
      setIsConnectingCloud(false);
      if (!authRes.success) {
        setFormError(authRes.error || 'Google Cloud Sync connection failed.');
        return;
      }
      cloudReady = true;
    }

    if (cloudCatalog.seeded && !cloudReady) {
      setFormError(
        `Cloud Database Sync (${BOOTSTRAPPED_CLOUD_ADMIN_EMAIL}) is required so changes persist permanently and aren't overwritten. Click "Connect Google & Save" below.`
      );
      return;
    }

    const parsedSizes = productForm.sizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedColors = productForm.colors
      .split(',')
      .map((entry) => {
        const [name, hex] = entry.split(':').map((s) => s.trim());
        return { name: name || 'Classic', hex: hex || '#D4AF37' };
      })
      .filter((c) => c.name);

    const parsedDetails = productForm.details
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const deterministicId = editingProduct ? editingProduct.id : `rgd-cust-${Date.now()}`;
    const payload = {
      id: deterministicId,
      name: productForm.name.trim(),
      subtitle: productForm.subtitle.trim(),
      category: productForm.category,
      categoryLabel:
        productForm.category === 'men'
          ? "Men's Clothing"
          : productForm.category === 'women'
          ? "Women's Clothing"
          : 'Luxury Watches',
      originalPrice: Number(productForm.originalPrice),
      price: productForm.discountEnabled ? Number(productForm.price) : Number(productForm.originalPrice),
      discountEnabled: productForm.discountEnabled,
      discountPercentage: productForm.discountEnabled ? Number(productForm.discountPercentage) : 0,
      rating: Number(productForm.rating),
      reviewsCount: Number(productForm.reviewsCount),
      image: productForm.images[0],
      images: productForm.images,
      description: productForm.description,
      details: parsedDetails,
      composition: productForm.composition,
      sizes: parsedSizes.length > 0 ? parsedSizes : ['One Size'],
      colors: parsedColors.length > 0 ? parsedColors : [{ name: 'Obsidian & Gold', hex: '#C6A45B' }],
      stockCount: Number(productForm.stockCount),
      isNewArrival: productForm.isNewArrival,
      isBestSeller: productForm.isBestSeller,
      isSpecialOffer: productForm.isSpecialOffer || productForm.discountEnabled,
    };

    setIsSavingProduct(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Server rejected product update.');
        return;
      }

      if (cloudReady) {
        await saveProductToFirestore({
          ...data,
          sortOrder: editingProduct ? (editingProduct as any).sortOrder : Date.now(),
        });
        showToast(
          editingProduct
            ? 'Product updated and saved permanently in Cloud Vault.'
            : 'New product saved permanently in Cloud Vault.'
        );
      } else {
        showToast(
          editingProduct
            ? 'Product updated locally. Connect Google Cloud Sync to make it permanent across server restarts.'
            : 'Product added locally. Connect Google Cloud Sync above so it never resets on server restart.',
          'info'
        );
      }

      setIsAddModalOpen(false);
      setEditingProduct(null);
      await refreshProducts();
    } catch (err: any) {
      setFormError(err?.message || 'Error while saving product.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!isAdminAuthenticated) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`Order status updated to ${newStatus}.`);
        await fetchOrders();
      } else {
        showToast('Failed to update order status.', 'error');
      }
    } catch {
      showToast('Failed to update order status.', 'error');
    }
  };

  // Security Settings: Change Admin Email
  const handleChangeAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotice(null);
    setIsUpdatingEmail(true);

    try {
      const res = await fetch('/api/admin/settings/email', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: newEmailInput,
          currentPassword: emailCurrentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailNotice({ type: 'error', text: data.error || 'Failed to update admin email.' });
      } else {
        setEmailNotice({ type: 'success', text: data.message || 'Admin email updated.' });
        setNewEmailInput('');
        setEmailCurrentPassword('');
        await refreshAuth();
        await fetchSecurityInfo();
        showToast('Administrator email updated.');
      }
    } catch {
      setEmailNotice({ type: 'error', text: 'Network error updating admin email.' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Security Settings: Change Admin Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);

    if (pwNew !== pwConfirm) {
      setPwNotice({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsUpdatingPw(true);
    try {
      const res = await fetch('/api/admin/settings/password', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNew,
          confirmPassword: pwConfirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwNotice({ type: 'error', text: data.error || 'Failed to update admin password.' });
      } else {
        setPwNotice({ type: 'success', text: data.message || 'Admin password updated securely.' });
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
        showToast('Administrator password updated.');
      }
    } catch {
      setPwNotice({ type: 'error', text: 'Network error updating admin password.' });
    } finally {
      setIsUpdatingPw(false);
    }
  };

  // Security Settings: Change Private Recovery Email
  const handleChangeRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryNotice(null);
    setIsUpdatingRecovery(true);

    try {
      const res = await fetch('/api/admin/settings/recovery-email', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRecoveryEmail: newRecoveryInput,
          currentPassword: recoveryCurrentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRecoveryNotice({ type: 'error', text: data.error || 'Failed to update recovery email.' });
      } else {
        setRecoveryNotice({ type: 'success', text: data.message || 'Recovery email updated.' });
        setNewRecoveryInput('');
        setRecoveryCurrentPassword('');
        await fetchSecurityInfo();
        showToast('Private recovery email updated.');
      }
    } catch {
      setRecoveryNotice({ type: 'error', text: 'Network error updating recovery email.' });
    } finally {
      setIsUpdatingRecovery(false);
    }
  };

  // Loading state while verifying HttpOnly cookie session
  if (isCheckingAuth) {
    return (
      <div className="py-24 bg-[#08080A] min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-neutral-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
          <span>Verifying security session...</span>
        </div>
      </div>
    );
  }

  // Strict Block: Logged-in Customer cannot enter Admin Console
  if (user && user.role !== 'admin') {
    return (
      <div className="py-16 sm:py-24 bg-[#08080A] min-h-screen flex items-center justify-center px-3 sm:px-4">
        <div className="w-full max-w-md bg-[#0F0F14] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-red-400 font-semibold">
            403 · Access Restricted
          </span>
          <h1 className="font-brand text-2xl font-bold text-white mt-1">
            Administrator Privileges Required
          </h1>
          <p className="text-xs text-neutral-400 mt-2 font-light leading-relaxed">
            You are currently signed in as a customer account (<strong className="text-neutral-200">{user.email}</strong>). Customer accounts are strictly blocked from accessing the Admin Directorate.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex-1 py-3 bg-[#181820] hover:bg-[#22222C] border border-[#2B2B36] text-xs font-semibold text-white rounded-xl cursor-pointer"
            >
              Return to Boutique
            </button>
            <button
              onClick={() => logout()}
              className="flex-1 py-3 bg-[#D4AF37] hover:bg-[#E6C25B] text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, show blank Admin Login Gate (NO autofill, NO demo passwords)
  if (!isAdminAuthenticated) {
    return (
      <div className="py-16 sm:py-24 bg-[#08080A] min-h-screen flex items-center justify-center px-3 sm:px-4">
        <div className="w-full max-w-md bg-[#0F0F14] border border-[#2B2B36] rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#1A1A22] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] mx-auto mb-3 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Shield className="w-7 h-7" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
              Maison Security Protocol
            </span>
            <h1 className="font-brand text-2xl font-bold text-white mt-1">
              Director Administration Suite
            </h1>
            <p className="text-xs text-neutral-400 mt-2 font-light">
              Authorized administrator credentials required to manage product galleries, discounts, and client dispatch manifests.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs text-neutral-400 font-medium mb-1">
                Administrator Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter administrator email"
                autoComplete="off"
                required
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="admin-password" className="block text-xs text-neutral-400 font-medium">
                  Administrator Password
                </label>
                <button
                  type="button"
                  onClick={() => setCurrentPage('forgot-password')}
                  className="text-[11px] text-[#D4AF37] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                id="admin-password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter administrator password"
                autoComplete="current-password"
                required
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] hover:opacity-90 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isLoggingIn ? 'Verifying...' : 'Unlock Director Suite'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate Metrics using authoritative effective prices
  const totalCatalogValue = products.reduce((acc, p) => acc + getEffectivePrice(p) * p.stockCount, 0);
  const totalStockUnits = products.reduce((acc, p) => acc + p.stockCount, 0);
  const totalOrderRevenue = adminOrders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="py-8 sm:py-16 bg-[#08080A] min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 sm:pb-8 mb-6 border-b border-[#1E1E26] gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-1">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              <span>Secure Maison Directorate</span>
            </div>
            <h1 className="font-brand text-2xl sm:text-3xl font-bold text-white">
              Executive Control Console
            </h1>
            <p className="text-[11px] text-neutral-400 mt-1">
              Signed in as <span className="text-[#E6C25B] font-mono">{user?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] text-black text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Masterpiece</span>
            </button>

            <button
              onClick={() => logout()}
              className="px-4 py-2.5 bg-[#16161D] hover:bg-[#202028] text-xs font-semibold text-neutral-300 rounded-xl border border-[#2B2B36] cursor-pointer"
            >
              Exit Suite
            </button>
          </div>
        </div>

        {/* Cloud Database Persistence Bar */}
        <div
          className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            cloudCatalog.authorized
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-[#17130B] border-[#D4AF37]/45'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                cloudCatalog.authorized
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-[#D4AF37]/15 text-[#E6C25B]'
              }`}
            >
              {cloudCatalog.authorized ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div className="text-xs">
              <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                <span>
                  {cloudCatalog.authorized
                    ? 'Permanent Cloud Catalog Connected'
                    : 'Connect Cloud Persistence So Products Never Reset'}
                </span>
                {cloudCatalog.authorized && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {cloudCatalog.email}
                  </span>
                )}
              </div>
              <p className="text-neutral-400 mt-0.5 leading-relaxed">
                {cloudCatalog.authorized
                  ? `All products, discounts, deletions, and uploaded images sync permanently to Cloud Firestore (${cloudCatalog.firestoreCount} stored items) across page reloads and server restarts.`
                  : `Sign in once with your authorized Google account (${BOOTSTRAPPED_CLOUD_ADMIN_EMAIL}) to permanently store new products and photos in Cloud Firestore across reloads and idle restarts.`}
              </p>
              {cloudNotice && <p className="text-red-400 mt-1">{cloudNotice}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {cloudCatalog.authorized ? (
              <>
                <button
                  type="button"
                  onClick={() => cloudCatalog.syncLocalCatalogNow()}
                  className="px-3.5 py-2 bg-[#16161D] hover:bg-[#22222C] border border-[#2B2B36] text-neutral-200 text-[11px] font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Sync Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => cloudCatalog.disconnectGoogleCloud()}
                  className="px-3 py-2 bg-[#16161D] hover:bg-[#22222C] border border-[#2B2B36] text-neutral-400 hover:text-white text-[11px] rounded-xl cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isConnectingCloud}
                onClick={handleConnectCloud}
                className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#E6C25B] text-black text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                {isConnectingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                <span>Connect Google Cloud Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* Top KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="p-4 sm:p-5 bg-[#0F0F14] border border-[#22222B] rounded-2xl">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Catalog Valuation</span>
              <DollarSign className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
              {formatPrice(totalCatalogValue)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">Effective active inventory value</div>
          </div>

          <div className="p-4 sm:p-5 bg-[#0F0F14] border border-[#22222B] rounded-2xl">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Vault Stock Units</span>
              <Layers className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
              {totalStockUnits} Pieces
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">{products.length} distinct cataloged SKUs</div>
          </div>

          <div className="p-4 sm:p-5 bg-[#0F0F14] border border-[#22222B] rounded-2xl">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Total Orders Logged</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
              {adminOrders.length} Invoices
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">Direct & demo client consignments</div>
          </div>

          <div className="p-4 sm:p-5 bg-[#0F0F14] border border-[#22222B] rounded-2xl">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Order Volume</span>
              <TrendingUp className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gold-gradient tabular-nums">
              {formatPrice(totalOrderRevenue)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">Logged manifest totals</div>
          </div>
        </div>

        {/* Tab Selection — horizontally scrollable on small mobile */}
        <div className="flex border-b border-[#1E1E26] gap-4 sm:gap-6 mb-6 sm:mb-8 text-xs font-medium overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'products'
                ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Catalog ({products.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('orders');
              fetchOrders();
            }}
            className={`pb-3 uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'orders'
                ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders ({adminOrders.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('security');
              fetchSecurityInfo();
            }}
            className={`pb-3 uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'security'
                ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Security Settings</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="bg-[#0F0F14] border border-[#22222B] rounded-3xl overflow-hidden shadow-xl">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#14141A] border-b border-[#202028] uppercase text-[10px] tracking-wider text-neutral-400 font-semibold">
                  <tr>
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-4">Category</th>
                    <th className="py-4 px-4">Pricing & Discount</th>
                    <th className="py-4 px-4">Inventory</th>
                    <th className="py-4 px-4">Gallery & Tags</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B1B22]">
                  {products.map((p) => {
                    const gallery = getNormalizedGallery(p);
                    const discounted = hasActiveDiscount(p);
                    const effPrice = getEffectivePrice(p);
                    const pct = getDiscountPercentage(p);

                    return (
                      <tr key={p.id} className="hover:bg-[#15151D] transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={gallery[0] || p.image}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded-xl border border-[#292934] shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-white text-sm line-clamp-1">{p.name}</div>
                              <div className="text-[11px] text-neutral-400 line-clamp-1">{p.subtitle}</div>
                              <div className="text-[10px] text-neutral-500 font-mono">
                                SKU: {p.sku} {p.isDemo ? '· DEMO' : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="uppercase text-[10px] tracking-wider font-semibold text-[#D4AF37]">
                            {p.categoryLabel}
                          </span>
                        </td>

                        <td className="py-4 px-4 tabular-nums">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{formatPrice(effPrice)}</span>
                            {discounted && p.originalPrice && (
                              <>
                                <span className="text-neutral-500 line-through text-xs">
                                  {formatPrice(p.originalPrice)}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#E6C25B] border border-[#D4AF37]/40 rounded font-bold">
                                  -{pct}%
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                p.inStock && p.stockCount > 0 ? 'bg-emerald-400' : 'bg-red-500'
                              }`}
                            />
                            <span className="tabular-nums font-mono text-xs">{p.stockCount} in stock</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#1C1C26] text-neutral-300 border border-[#2B2B38] rounded">
                              {gallery.length} {gallery.length === 1 ? 'Photo' : 'Photos'}
                            </span>
                            {p.isNewArrival && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#252530] text-[#F3E5AB] rounded">
                                New
                              </span>
                            )}
                            {p.isBestSeller && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#252530] text-[#D4AF37] rounded">
                                Icon
                              </span>
                            )}
                            {(discounted || p.isSpecialOffer) && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#252530] text-yellow-400 rounded">
                                Offer
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(p)}
                              aria-label={`Edit ${p.name}`}
                              className="p-2 text-neutral-400 hover:text-[#D4AF37] hover:bg-[#1F1F2A] rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              aria-label={`Delete ${p.name}`}
                              className="p-2 text-neutral-400 hover:text-red-400 hover:bg-[#1F1F2A] rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Product Cards */}
            <div className="md:hidden divide-y divide-[#1E1E26]">
              {products.map((p) => {
                const gallery = getNormalizedGallery(p);
                const discounted = hasActiveDiscount(p);
                const effPrice = getEffectivePrice(p);
                const pct = getDiscountPercentage(p);

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={gallery[0] || p.image}
                        alt={p.name}
                        className="w-16 h-16 object-cover rounded-xl border border-[#292934] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-semibold">
                          {p.categoryLabel}
                        </div>
                        <div className="font-semibold text-white text-sm truncate">{p.name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap tabular-nums">
                          <span className="font-bold text-white text-sm">{formatPrice(effPrice)}</span>
                          {discounted && p.originalPrice && (
                            <>
                              <span className="text-neutral-500 line-through text-xs">
                                {formatPrice(p.originalPrice)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#E6C25B] rounded font-bold">
                                -{pct}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1B1B22] text-xs">
                      <div className="flex items-center gap-2 text-neutral-400">
                        <span>{p.stockCount} in stock</span>
                        <span>·</span>
                        <span>{gallery.length} photos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="px-3 py-1.5 bg-[#181822] text-[#D4AF37] rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 bg-[#181822] text-red-400 rounded-lg"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="bg-[#0F0F14] border border-[#22222B] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#14141A] border-b border-[#202028] flex items-center justify-between text-xs text-neutral-400">
              <span>Client Dispatch Manifests ({adminOrders.length})</span>
              <button
                onClick={fetchOrders}
                disabled={isLoadingOrders}
                className="text-[#D4AF37] hover:underline cursor-pointer"
              >
                {isLoadingOrders ? 'Refreshing...' : 'Refresh Feeds'}
              </button>
            </div>

            {/* Desktop Orders Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#121217] border-b border-[#1E1E26] uppercase text-[10px] tracking-wider text-neutral-400 font-semibold">
                  <tr>
                    <th className="py-4 px-6">Manifest ID</th>
                    <th className="py-4 px-4">Client Name & Address</th>
                    <th className="py-4 px-4">Pieces</th>
                    <th className="py-4 px-4">Settlement</th>
                    <th className="py-4 px-4">Total</th>
                    <th className="py-4 px-6">Dispatch State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A22]">
                  {adminOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#15151D] transition-colors">
                      <td className="py-4 px-6 font-mono text-white">
                        <div className="font-bold">{order.orderNumber}</div>
                        <div className="text-[10px] text-neutral-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-[#D4AF37] flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3" />
                          <span>{order.trackingNumber}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{order.customer.name}</div>
                        <div className="text-neutral-400 text-[11px]">{order.customer.email}</div>
                        <div className="text-neutral-500 text-[10px]">
                          {order.customer.city}, {order.customer.country}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-xs">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="line-clamp-1">
                              {it.quantity}x {it.name}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="uppercase text-[10px] font-mono px-2 py-0.5 bg-[#1B1B24] rounded text-neutral-300">
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card Demo'}
                        </span>
                        <div className="text-[10px] text-yellow-400 uppercase mt-0.5 font-mono">
                          [{order.paymentStatus === 'demo_unpaid' ? 'DEMO ONLY' : order.paymentStatus}]
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-white tabular-nums text-sm">
                        {formatPrice(order.total)}
                      </td>

                      <td className="py-4 px-6">
                        <select
                          value={order.orderStatus}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="py-1.5 px-3 bg-[#16161E] border border-[#2B2B38] rounded-lg text-xs font-semibold text-emerald-400 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                        >
                          <option value="Processing">Processing</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Order Cards */}
            <div className="md:hidden divide-y divide-[#1E1E26]">
              {adminOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-white">{order.orderNumber}</div>
                      <div className="text-[11px] text-neutral-400">{order.customer.name}</div>
                    </div>
                    <div className="font-bold text-gold-gradient tabular-nums text-sm">
                      {formatPrice(order.total)}
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {order.items.map((it, idx) => (
                      <div key={idx}>{it.quantity}x {it.name}</div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#1B1B22]">
                    <span className="text-[10px] font-mono text-yellow-400 uppercase">
                      {order.paymentMethod === 'cod' ? 'COD [pending]' : 'Card [DEMO ONLY]'}
                    </span>
                    <select
                      value={order.orderStatus}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="py-1.5 px-2.5 bg-[#16161E] border border-[#2B2B38] rounded-lg text-xs font-semibold text-emerald-400"
                    >
                      <option value="Processing">Processing</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN SECURITY SETTINGS */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Security & Email Status Banner */}
            <div className="p-5 sm:p-6 bg-[#0F0F14] border border-[#24242E] rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                  Administrator Account Identity
                </div>
                <div className="text-sm font-bold text-white mt-1 font-mono">
                  {securityInfo?.adminEmail || user?.email}
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Private Recovery Email:{' '}
                  <span className="text-neutral-200">
                    {securityInfo?.hasPrivateRecoveryEmail ? 'Configured (Hidden for Security)' : 'Not Configured'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#14141B] border border-[#262632] text-xs">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400">Email OTP Service</div>
                {securityInfo?.emailServiceConfigured ? (
                  <div className="text-emerald-400 font-semibold mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active ({securityInfo.emailProvider.toUpperCase()})</span>
                  </div>
                ) : (
                  <div className="text-amber-400 font-semibold mt-0.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Not Configured (Set RESEND_API_KEY or SMTP_*)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION 1: CHANGE ADMIN EMAIL */}
              <div className="p-6 sm:p-8 bg-[#0F0F14] border border-[#D4AF37]/30 rounded-3xl shadow-xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-bold block">
                      Security Action
                    </span>
                    <h2 className="font-brand text-lg font-bold text-white">CHANGE ADMIN EMAIL</h2>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mb-5 font-light">
                  Verify your current password to migrate your administrator login email. Active sessions on other devices will be invalidated.
                </p>

                {emailNotice && (
                  <div
                    className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                      emailNotice.type === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border border-red-500/40 text-red-300'
                    }`}
                  >
                    {emailNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{emailNotice.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangeAdminEmail} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Current Admin Email</label>
                    <input
                      type="text"
                      readOnly
                      value={securityInfo?.adminEmail || user?.email || ''}
                      className="w-full py-2.5 px-3.5 bg-[#121217] border border-[#24242E] rounded-xl text-neutral-400 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-admin-email" className="block text-neutral-400 font-medium mb-1">
                      New Admin Email
                    </label>
                    <input
                      id="new-admin-email"
                      type="email"
                      required
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="Enter new administrator email"
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="email-current-pw" className="block text-neutral-400 font-medium mb-1">
                      Current Password (Required)
                    </label>
                    <input
                      id="email-current-pw"
                      type="password"
                      required
                      value={emailCurrentPassword}
                      onChange={(e) => setEmailCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingEmail}
                    className="w-full py-3 bg-[#D4AF37] hover:bg-[#E6C25B] text-black font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    {isUpdatingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Update Admin Email</span>
                  </button>
                </form>
              </div>

              {/* SECTION 2: CHANGE ADMIN PASSWORD */}
              <div className="p-6 sm:p-8 bg-[#0F0F14] border border-[#D4AF37]/30 rounded-3xl shadow-xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-bold block">
                      Security Action
                    </span>
                    <h2 className="font-brand text-lg font-bold text-white">CHANGE ADMIN PASSWORD</h2>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mb-5 font-light">
                  Passwords are stored salted and hashed; your existing password is never displayed. Updating rotates your active session.
                </p>

                {pwNotice && (
                  <div
                    className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                      pwNotice.type === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border border-red-500/40 text-red-300'
                    }`}
                  >
                    {pwNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{pwNotice.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangeAdminPassword} className="space-y-4 text-xs">
                  <div>
                    <label htmlFor="pw-current" className="block text-neutral-400 font-medium mb-1">
                      Current Password
                    </label>
                    <input
                      id="pw-current"
                      type="password"
                      required
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="pw-new" className="block text-neutral-400 font-medium mb-1">
                      New Strong Password
                    </label>
                    <input
                      id="pw-new"
                      type="password"
                      required
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      placeholder="Min 8 chars + number or symbol"
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="pw-confirm" className="block text-neutral-400 font-medium mb-1">
                      Confirm New Password
                    </label>
                    <input
                      id="pw-confirm"
                      type="password"
                      required
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      placeholder="Re-enter new strong password"
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingPw}
                    className="w-full py-3 bg-[#D4AF37] hover:bg-[#E6C25B] text-black font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    {isUpdatingPw && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Update Admin Password</span>
                  </button>
                </form>
              </div>
            </div>

            {/* SECTION 3: CHANGE PRIVATE RECOVERY EMAIL */}
            <div className="p-6 sm:p-8 bg-[#0F0F14] border border-[#24242E] rounded-3xl shadow-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-bold block">
                    OTP Destination
                  </span>
                  <h2 className="font-brand text-lg font-bold text-white">CHANGE PRIVATE RECOVERY EMAIL</h2>
                </div>
              </div>
              <p className="text-xs text-neutral-400 mb-5 font-light">
                Forgot-Password OTP codes are dispatched exclusively to your private recovery inbox. For security, the saved address is never displayed publicly.
              </p>

              {recoveryNotice && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                    recoveryNotice.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border border-red-500/40 text-red-300'
                  }`}
                >
                  {recoveryNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{recoveryNotice.text}</span>
                </div>
              )}

              <form onSubmit={handleChangeRecoveryEmail} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
                <div>
                  <label htmlFor="new-recovery-email" className="block text-neutral-400 font-medium mb-1">
                    New Private Recovery Email
                  </label>
                  <input
                    id="new-recovery-email"
                    type="email"
                    required
                    value={newRecoveryInput}
                    onChange={(e) => setNewRecoveryInput(e.target.value)}
                    placeholder="Enter private recovery email"
                    className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="recovery-current-pw" className="block text-neutral-400 font-medium mb-1">
                    Current Password (Required)
                  </label>
                  <input
                    id="recovery-current-pw"
                    type="password"
                    required
                    value={recoveryCurrentPassword}
                    onChange={(e) => setRecoveryCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingRecovery}
                  className="w-full py-2.5 px-4 bg-[#1A1A24] hover:bg-[#242432] border border-[#D4AF37]/50 text-[#E6C25B] font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  {isUpdatingRecovery && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Update Recovery Email</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT PRODUCT WITH MULTI-IMAGE GALLERY & INDIVIDUAL DISCOUNT SYSTEM */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-[#0F0F14] border border-[#2B2B36] rounded-3xl p-4 sm:p-8 shadow-2xl my-4 sm:my-8">
              <div className="flex items-center justify-between pb-4 border-b border-[#202028] mb-5">
                <h3 className="font-brand text-lg sm:text-xl font-bold text-white pr-4">
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Catalog New Product'}
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="Close modal"
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-[#181820] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Creation Name</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="e.g. RGD Royal Chronograph"
                      className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Subtitle / Material Spec</label>
                    <input
                      type="text"
                      required
                      value={productForm.subtitle}
                      onChange={(e) => setProductForm({ ...productForm, subtitle: e.target.value })}
                      placeholder="e.g. 18K Solid Rose Gold Octagonal"
                      className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value as ProductCategory })}
                      className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                    >
                      <option value="watches">Luxury Watches</option>
                      <option value="men">Men's Clothing</option>
                      <option value="women">Women's Clothing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Vault Inventory Count</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={productForm.stockCount}
                      onChange={(e) => setProductForm({ ...productForm, stockCount: Number(e.target.value) })}
                      className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* INDIVIDUAL PRODUCT DISCOUNT SYSTEM */}
                <div className="p-4 rounded-2xl bg-[#13131A] border border-[#282834] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-[#D4AF37]" />
                      <span className="font-semibold text-white">Pricing & Individual Discount</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-200">
                        <input
                          type="checkbox"
                          checked={productForm.discountEnabled}
                          onChange={(e) => handleToggleDiscount(e.target.checked)}
                          className="rounded bg-[#141419] border-[#2B2B36] accent-[#D4AF37]"
                        />
                        <span>Enable Discount</span>
                      </label>
                      {productForm.discountEnabled && (
                        <button
                          type="button"
                          onClick={() => handleToggleDiscount(false)}
                          className="text-[11px] text-red-400 hover:underline cursor-pointer"
                        >
                          Remove Discount
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-neutral-400 font-medium mb-1">Original Price (USD)</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={productForm.originalPrice}
                        onChange={(e) => handleOriginalPriceChange(Number(e.target.value))}
                        className="w-full py-2 px-3 bg-[#0E0E12] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    {productForm.discountEnabled && (
                      <>
                        <div>
                          <label className="block text-neutral-400 font-medium mb-1">Discounted Price (USD)</label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, productForm.originalPrice - 1)}
                            required
                            value={productForm.price}
                            onChange={(e) => handleDiscountedPriceChange(Number(e.target.value))}
                            className="w-full py-2 px-3 bg-[#0E0E12] border border-[#D4AF37]/50 rounded-xl text-[#F3E5AB] font-semibold focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="block text-neutral-400 font-medium mb-1">Discount Percentage (%)</label>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={productForm.discountPercentage}
                            onChange={(e) => handleDiscountPercentageChange(Number(e.target.value))}
                            className="w-full py-2 px-3 bg-[#0E0E12] border border-[#D4AF37]/50 rounded-xl text-[#D4AF37] font-semibold focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Live Storefront Pricing Preview */}
                  <div className="pt-2 border-t border-[#20202A] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-neutral-400">Customer Storefront Display:</span>
                    {productForm.discountEnabled && productForm.price > 0 && productForm.price < productForm.originalPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 line-through">{formatPrice(productForm.originalPrice)}</span>
                        <span className="text-white font-bold text-sm">{formatPrice(productForm.price)}</span>
                        <span className="px-2 py-0.5 bg-[#D4AF37] text-black text-[10px] font-bold rounded">
                          {productForm.discountPercentage}% OFF
                        </span>
                      </div>
                    ) : (
                      <span className="text-white font-bold text-sm">{formatPrice(productForm.originalPrice)}</span>
                    )}
                  </div>
                </div>

                {/* MULTI-IMAGE GALLERY MANAGER */}
                <div className="p-4 rounded-2xl bg-[#13131A] border border-[#282834] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ImagePlus className="w-4 h-4 text-[#D4AF37]" />
                      <span className="font-semibold text-white">
                        Product Image Gallery ({productForm.images.length})
                      </span>
                    </div>

                    <label className="px-3 py-1.5 bg-[#1B1B24] hover:bg-[#242430] border border-[#D4AF37]/40 text-[#E6C25B] rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer">
                      {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{isUploadingImage ? 'Uploading...' : 'Upload Image Files'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Add Image by URL */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Paste image URL or /src/assets/... path"
                      className="flex-1 py-2 px-3 bg-[#0E0E12] border border-[#2B2B36] rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-4 py-2 bg-[#1D1D26] hover:bg-[#D4AF37] hover:text-black text-neutral-200 font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Add Image URL
                    </button>
                  </div>

                  {/* Quick Asset Library Shortcuts */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] text-neutral-500 whitespace-nowrap">Add Studio Photo:</span>
                    {[
                      { label: 'Rose Gold Watch', path: '/src/assets/images/watch_rose_gold_1794494079347.jpg' },
                      { label: 'Black Tourbillon', path: '/src/assets/images/watch_black_diamond_1794494079598.jpg' },
                      { label: 'Perpetual Blue', path: '/src/assets/images/watch_perpetual_blue_1794495941635.jpg' },
                      { label: 'Men Suit', path: '/src/assets/images/men_collection_suit_1794494077378.jpg' },
                      { label: 'Men Coat', path: '/src/assets/images/men_black_overcoat_1794495965409.jpg' },
                      { label: 'Women Dress', path: '/src/assets/images/women_evening_dress_1794494078742.jpg' },
                      { label: 'Women Coat', path: '/src/assets/images/women_silk_coat_1794495941084.jpg' },
                    ].map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => {
                          if (!productForm.images.includes(item.path)) {
                            setProductForm((prev) => ({ ...prev, images: [...prev.images, item.path] }));
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#1B1B24] hover:bg-[#D4AF37] hover:text-black text-neutral-300 whitespace-nowrap transition-colors cursor-pointer"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Gallery Preview Grid with Reorder, Select Main, Remove */}
                  {productForm.images.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-[#2C2C38] text-neutral-500">
                      No images added yet. Upload files or add an image URL above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                      {productForm.images.map((imgUrl, idx) => (
                        <div
                          key={`${imgUrl}-${idx}`}
                          className={`relative rounded-xl overflow-hidden border bg-[#0E0E12] ${
                            idx === 0 ? 'border-[#D4AF37]' : 'border-[#292935]'
                          }`}
                        >
                          <div className="aspect-square w-full bg-[#09090C]">
                            <img src={imgUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>

                          {idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#D4AF37] text-black text-[9px] font-bold uppercase rounded flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-black" />
                              <span>Main</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            aria-label={`Remove image ${idx + 1}`}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/80 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="p-1.5 flex items-center justify-between gap-1 bg-[#121218] border-t border-[#22222C]">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveImage(idx, -1)}
                                aria-label="Move image left"
                                className="p-1 rounded bg-[#1B1B24] disabled:opacity-30 text-neutral-300 hover:text-white cursor-pointer"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === productForm.images.length - 1}
                                onClick={() => handleMoveImage(idx, 1)}
                                aria-label="Move image right"
                                className="p-1 rounded bg-[#1B1B24] disabled:opacity-30 text-neutral-300 hover:text-white cursor-pointer"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetMainImage(idx)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#1D1A12] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-semibold cursor-pointer"
                              >
                                Set Main
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Available Sizes (comma-separated)</label>
                    <input
                      type="text"
                      value={productForm.sizes}
                      onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                      placeholder="e.g. 41mm, 43mm or US 2, US 4"
                      className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">Colors (Format: Name: #Hex, ...)</label>
                    <input
                      type="text"
                      value={productForm.colors}
                      onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })}
                      placeholder="e.g. Rose Gold: #B76E79, Noir: #000000"
                      className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                  <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isNewArrival}
                      onChange={(e) => setProductForm({ ...productForm, isNewArrival: e.target.checked })}
                      className="rounded bg-[#141419] border-[#2B2B36] accent-[#D4AF37]"
                    />
                    <span>New Arrival Badge</span>
                  </label>

                  <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isBestSeller}
                      onChange={(e) => setProductForm({ ...productForm, isBestSeller: e.target.checked })}
                      className="rounded bg-[#141419] border-[#2B2B36] accent-[#D4AF37]"
                    />
                    <span>Best Seller Badge</span>
                  </label>

                  <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isSpecialOffer}
                      onChange={(e) => setProductForm({ ...productForm, isSpecialOffer: e.target.checked })}
                      className="rounded bg-[#141419] border-[#2B2B36] accent-[#D4AF37]"
                    />
                    <span>Private Offer</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-[#202028] flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 bg-[#181820] text-neutral-300 rounded-xl hover:bg-[#20202A] cursor-pointer"
                  >
                    Cancel
                  </button>
                  {!cloudCatalog.authorized && (
                    <button
                      type="button"
                      disabled={isSavingProduct || isConnectingCloud}
                      onClick={(e) => handleSaveProduct(e, true)}
                      className="px-5 py-2.5 bg-[#1B1912] border border-[#D4AF37]/60 text-[#E6C25B] hover:bg-[#D4AF37]/15 font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      {isConnectingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                      <span>Connect Google & Save Permanently</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingProduct || isConnectingCloud}
                    className="px-6 py-2.5 bg-[#D4AF37] text-black font-bold uppercase tracking-wider rounded-xl hover:opacity-90 shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingProduct ? 'Save Changes' : 'Save Product'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
