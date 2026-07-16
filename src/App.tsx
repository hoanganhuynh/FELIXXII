import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import BodyProfileModal from "./components/BodyProfileModal";
import LoginDrawer from "./components/LoginDrawer";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import About from "./pages/About";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

import AdminLayout from "./admin/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import AdminProducts from "./admin/pages/Products";
import ProductEditor from "./admin/pages/ProductEditor";
import AdminCollections from "./admin/pages/Collections";
import AdminOrders from "./admin/pages/Orders";
import AdminCustomers from "./admin/pages/Customers";
import SizeRules from "./admin/pages/SizeRules";
import ImportPage from "./admin/pages/Import";
import Reference from "./admin/pages/Reference";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Storefront() {
  return (
    <>
      <Header />
      <CartDrawer />
      <BodyProfileModal />
      <LoginDrawer />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/san-pham/:id" element={<Product />} />
          <Route path="/about" element={<About />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ---- admin (standalone, no storefront chrome) ---- */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<ProductEditor />} />
          <Route path="products/:id" element={<ProductEditor />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="size-rules" element={<SizeRules />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="reference" element={<Reference />} />
        </Route>

        {/* ---- storefront ---- */}
        <Route path="*" element={<Storefront />} />
      </Routes>
    </>
  );
}
