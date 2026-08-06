import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cartCount, cartTotal, useCart, type CartLine } from "../store/cart";
import { useAuth } from "../store/auth";
import { productById, useProducts } from "../store/products";
import { useCampaigns } from "../store/campaigns";
import { computeCartDiscount } from "../lib/discount";
import ProductImage from "../components/ProductImage";
import { vnd } from "../components/ProductCard";

type Step = "information" | "shipping" | "payment";
type PaymentMethod = "card" | "paypal" | "momo" | "gpay" | "bank";
type ShippingMethod = "standard" | "express";

const steps: Step[] = ["information", "shipping", "payment"];
const paymentLogos = {
  visa: "/Visa_Inc._logo_(2021–present).svg.webp",
  mastercard: "/Mastercard-Logo-1.png",
  amex: "/American_Express_logo_(2018).svg",
  paypal: "/paypal-seeklogo.svg",
  momo: "/Logo-MoMo-Square.webp",
  googlePay: "/Google_Pay_Logo.svg.webp",
  bank: "/credit-card.png",
};

const shippingMethods: Record<ShippingMethod, { title: string; eta: string; price: number }> = {
  standard: { title: "Standard Shipping", eta: "5 - 7 business days", price: 0 },
  express: { title: "Atelier Courier", eta: "1 - 2 business days in Ho Chi Minh City", price: 180000 },
};

const paymentMethods: { id: PaymentMethod; label: string; helper: string; logos: { src: string; alt: string }[] }[] = [
  {
    id: "card",
    label: "Credit card",
    helper: "Visa, Mastercard, American Express",
    logos: [
      { src: paymentLogos.visa, alt: "Visa" },
      { src: paymentLogos.mastercard, alt: "Mastercard" },
      { src: paymentLogos.amex, alt: "American Express" },
    ],
  },
  { id: "paypal", label: "PayPal", helper: "Pay securely with your PayPal account", logos: [{ src: paymentLogos.paypal, alt: "PayPal" }] },
  { id: "momo", label: "MoMo", helper: "Scan or confirm payment in MoMo wallet", logos: [{ src: paymentLogos.momo, alt: "MoMo" }] },
  { id: "gpay", label: "Google Pay", helper: "Fast checkout with a saved Google payment method", logos: [{ src: paymentLogos.googlePay, alt: "Google Pay" }] },
  { id: "bank", label: "Bank transfer", helper: "Receive transfer details after placing the order", logos: [{ src: paymentLogos.bank, alt: "Bank transfer" }] },
];

function defaultForm(profile: ReturnType<typeof useAuth.getState>["profile"]) {
  const parts = (profile?.name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    email: profile?.email ?? "",
    newsletter: true,
    country: "Vietnam",
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
    address: "",
    apartment: "",
    city: "",
    postalCode: "",
    phone: profile?.phone ?? "",
  };
}

export default function Checkout() {
  const { lines, setOpen, clear } = useCart();
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const profile = useAuth((s) => s.profile);
  const setLoginOpen = useAuth((s) => s.setLoginOpen);
  const products = useProducts((s) => s.products);
  const campaigns = useCampaigns((s) => s.campaigns);
  const fetchCampaigns = useCampaigns((s) => s.fetch);
  const [step, setStep] = useState<Step>("information");
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [form, setForm] = useState(() => defaultForm(profile));
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    setOpen(false);
    fetchCampaigns();
  }, [fetchCampaigns, setOpen]);

  useEffect(() => {
    if (ready && !user) setLoginOpen(true);
  }, [ready, setLoginOpen, user]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      email: current.email || profile?.email || "",
      phone: current.phone || profile?.phone || "",
    }));
  }, [profile?.email, profile?.phone]);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const subtotal = cartTotal(lines);
  const count = cartCount(lines);
  const campaignDiscount = useMemo(
    () => computeCartDiscount(lines, campaigns, productsById).amount,
    [campaigns, lines, productsById],
  );
  const codeDiscount = discountApplied ? Math.round(subtotal * 0.05) : 0;
  const shippingCost = shippingMethods[shipping].price;
  const total = Math.max(0, subtotal - campaignDiscount - codeDiscount + shippingCost);

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const continueFromInfo = () => setStep("shipping");
  const continueFromShipping = () => setStep("payment");
  const placeOrder = () => {
    setOrderPlaced(true);
    clear();
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen px-5 pb-20 pt-28 md:px-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center border edge bg-[var(--color-bg)] px-8 py-16 text-center">
          <p className="label text-ink-soft">ORDER RECEIVED</p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Thank you for your order.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-ink-soft">
            This demo checkout has captured the order flow. A production payment gateway can be connected to this step.
          </p>
          <Link
            to="/shop"
            className="mt-8 flex h-12 items-center justify-center rounded-full bg-ink px-8 text-sm tracking-[0.04em] text-white transition-opacity hover:opacity-85"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen px-5 pb-20 pt-28 md:px-10">
        <div className="mx-auto max-w-xl border edge bg-[var(--color-bg)] px-8 py-12 text-center">
          <p className="label text-ink-soft">CHECKOUT</p>
          <h1 className="mt-4 font-serif text-4xl">Checking your account...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-5 pb-20 pt-28 md:px-10">
        <div className="mx-auto flex max-w-xl flex-col items-center border edge bg-[var(--color-bg)] px-8 py-14 text-center">
          <p className="label text-ink-soft">CHECKOUT</p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Sign in to checkout.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-ink-soft">
            Please log in with your email before continuing to shipping and payment.
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="mt-8 flex h-12 items-center justify-center rounded-full bg-ink px-8 text-sm tracking-[0.04em] text-white transition-opacity hover:opacity-85"
          >
            Sign in with email
          </button>
          <Link to="/shop" className="mt-5 text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink">
            Return to cart
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen border-t edge pt-[62px]">
      <div className="mx-auto grid min-h-[calc(100vh-62px)] w-full max-w-[1380px] lg:grid-cols-[minmax(0,760px)_460px] lg:justify-center">
        <section className="px-5 py-9 md:px-10 lg:w-full lg:py-14 lg:pr-14">
          <CheckoutCrumbs step={step} onStep={setStep} />

          {lines.length === 0 ? (
            <EmptyCart />
          ) : (
            <>
              {step === "information" && (
                <InformationStep
                  form={form}
                  onUpdate={update}
                  onExpress={(method) => {
                    setPayment(method);
                    setStep("payment");
                  }}
                  onContinue={continueFromInfo}
                />
              )}
              {step === "shipping" && (
                <ShippingStep
                  form={form}
                  shipping={shipping}
                  onShipping={setShipping}
                  onBack={() => setStep("information")}
                  onContinue={continueFromShipping}
                />
              )}
              {step === "payment" && (
                <PaymentStep
                  form={form}
                  shipping={shipping}
                  payment={payment}
                  onPayment={setPayment}
                  onBack={() => setStep("shipping")}
                  onEditInfo={() => setStep("information")}
                  onEditShipping={() => setStep("shipping")}
                  onPay={placeOrder}
                />
              )}
            </>
          )}
        </section>

        <OrderSummary
          lines={lines}
          subtotal={subtotal}
          shippingCost={shippingCost}
          campaignDiscount={campaignDiscount}
          codeDiscount={codeDiscount}
          total={total}
          discountCode={discountCode}
          onDiscountCode={setDiscountCode}
          onApplyDiscount={() => setDiscountApplied(discountCode.trim().length > 0)}
          count={count}
        />
      </div>
    </div>
  );
}

function CheckoutCrumbs({ step, onStep }: { step: Step; onStep: (step: Step) => void }) {
  const activeIndex = steps.indexOf(step);
  return (
    <nav className="mt-7 flex flex-wrap items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-ink-soft">
      <Link to="/shop" className="transition-colors hover:text-ink">Cart</Link>
      {steps.map((s, index) => (
        <span key={s} className="flex items-center gap-2">
          <span className="text-ink-soft">/</span>
          <button
            onClick={() => index <= activeIndex && onStep(s)}
            disabled={index > activeIndex}
            className={`transition-colors ${
              step === s ? "text-ink underline underline-offset-4" : index < activeIndex ? "hover:text-ink" : "text-ink-soft/60"
            }`}
          >
            {titleCase(s)}
          </button>
        </span>
      ))}
    </nav>
  );
}

function InformationStep({
  form,
  onUpdate,
  onExpress,
  onContinue,
}: {
  form: ReturnType<typeof defaultForm>;
  onUpdate: (field: keyof ReturnType<typeof defaultForm>, value: string | boolean) => void;
  onExpress: (method: PaymentMethod) => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-9">
      <p className="label text-center text-ink-soft">EXPRESS CHECKOUT</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ExpressButton logo={{ src: paymentLogos.paypal, alt: "PayPal" }} onClick={() => onExpress("paypal")} />
        <ExpressButton logo={{ src: paymentLogos.momo, alt: "MoMo" }} onClick={() => onExpress("momo")} />
        <ExpressButton logo={{ src: paymentLogos.googlePay, alt: "Google Pay" }} onClick={() => onExpress("gpay")} />
      </div>
      <Divider label="OR" />

      <div className="flex items-end justify-between gap-5">
        <h1 className="font-serif text-3xl">Contact</h1>
        <button className="link-underline text-sm text-ink-soft transition-colors hover:text-ink">Sign in</button>
      </div>
      <Field className="mt-4" placeholder="Email" value={form.email} onChange={(v) => onUpdate("email", v)} />
      <label className="mt-4 flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.newsletter}
          onChange={(e) => onUpdate("newsletter", e.target.checked)}
          className="h-4 w-4 accent-ink"
        />
        Email me with news and atelier notes
      </label>

      <h2 className="mt-9 font-serif text-3xl leading-tight">Shipping address</h2>
      <div className="mt-4 grid gap-3">
        <Field placeholder="Country/Region" value={form.country} onChange={(v) => onUpdate("country", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field placeholder="First name" value={form.firstName} onChange={(v) => onUpdate("firstName", v)} />
          <Field placeholder="Last name" value={form.lastName} onChange={(v) => onUpdate("lastName", v)} />
        </div>
        <Field placeholder="Address, building, street, ward, district" value={form.address} onChange={(v) => onUpdate("address", v)} />
        <Field placeholder="Apartment, suite, company name (optional)" value={form.apartment} onChange={(v) => onUpdate("apartment", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field placeholder="City" value={form.city} onChange={(v) => onUpdate("city", v)} />
          <Field placeholder="Postal code (optional)" value={form.postalCode} onChange={(v) => onUpdate("postalCode", v)} />
        </div>
        <Field placeholder="Phone" value={form.phone} onChange={(v) => onUpdate("phone", v)} />
      </div>

      <StepActions backTo="/shop" backLabel="Return to cart" onContinue={onContinue} continueLabel="Continue to shipping" />
    </div>
  );
}

function ShippingStep({
  form,
  shipping,
  onShipping,
  onBack,
  onContinue,
}: {
  form: ReturnType<typeof defaultForm>;
  shipping: ShippingMethod;
  onShipping: (method: ShippingMethod) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-10 space-y-8">
      <ReviewRows form={form} onEdit={onBack} />
      <section>
        <h1 className="font-serif text-4xl">Shipping method</h1>
        <div className="mt-6 overflow-hidden border edge">
          {(Object.keys(shippingMethods) as ShippingMethod[]).map((method) => {
            const option = shippingMethods[method];
            const active = shipping === method;
            return (
              <button
                key={method}
                onClick={() => onShipping(method)}
                className={`flex w-full items-center justify-between gap-4 border-b edge px-5 py-5 text-left last:border-b-0 ${
                  active ? "bg-[var(--color-tile)]/70" : "bg-[var(--color-bg)] hover:bg-[var(--color-tile)]/35"
                }`}
              >
                <span className="flex items-center gap-3">
                  <RadioDot active={active} />
                  <span>
                    <span className="block font-semibold">{option.title}</span>
                    <span className="block text-sm text-ink-soft">{option.eta}</span>
                  </span>
                </span>
                <span className="shrink-0 font-semibold">{option.price === 0 ? "Free" : vnd(option.price)}</span>
              </button>
            );
          })}
        </div>
      </section>
      <StepActions onBack={onBack} backLabel="Return to information" onContinue={onContinue} continueLabel="Continue to payment" />
    </div>
  );
}

function PaymentStep({
  form,
  shipping,
  payment,
  onPayment,
  onBack,
  onEditInfo,
  onEditShipping,
  onPay,
}: {
  form: ReturnType<typeof defaultForm>;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  onPayment: (method: PaymentMethod) => void;
  onBack: () => void;
  onEditInfo: () => void;
  onEditShipping: () => void;
  onPay: () => void;
}) {
  return (
    <div className="mt-10 space-y-8">
      <ReviewRows form={form} onEdit={onEditInfo} />
      <div className="grid grid-cols-[90px_1fr_auto] gap-4 border-y edge py-5 text-sm">
        <span className="text-ink-soft">Shipping</span>
        <span className="font-semibold">{shippingMethods[shipping].title} · {shippingMethods[shipping].price === 0 ? "Free" : vnd(shippingMethods[shipping].price)}</span>
        <button onClick={onEditShipping} className="link-underline text-ink-soft transition-colors hover:text-ink">Change</button>
      </div>

      <section>
        <h1 className="font-serif text-4xl">Payment</h1>
        <p className="mt-2 text-sm text-ink-soft">All transactions are secure and encrypted.</p>
        <div className="mt-5 overflow-hidden border edge">
          {paymentMethods.map((method) => {
            const active = payment === method.id;
            return (
              <div key={method.id}>
                <button
                  onClick={() => onPayment(method.id)}
                  className={`flex w-full items-center justify-between gap-4 border-b edge px-5 py-4 text-left transition-colors ${
                    active ? "bg-[var(--color-tile)]/70" : "bg-[var(--color-bg)] hover:bg-[var(--color-tile)]/35"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <RadioDot active={active} />
                    <span>
                      <span className="block font-semibold">{method.label}</span>
                      <span className="block text-sm text-ink-soft">{method.helper}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {method.logos.length > 0 ? method.logos.map((logo) => (
                      <PaymentLogo key={logo.alt} src={logo.src} alt={logo.alt} />
                    )) : (
                      <span className="border edge bg-[var(--color-bg)] px-2 py-1 text-xs font-semibold text-ink">
                        {method.id === "gpay" ? "G Pay" : "Bank"}
                      </span>
                    )}
                  </span>
                </button>
                {active && method.id === "card" && (
                  <div className="grid gap-3 border-b edge bg-[var(--color-bg)] p-5">
                    <Field placeholder="Card number" value="" onChange={() => {}} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field placeholder="Expiration date (MM / YY)" value="" onChange={() => {}} />
                      <Field placeholder="Security code" value="" onChange={() => {}} />
                    </div>
                    <Field placeholder="Name on card" value={`${form.firstName} ${form.lastName}`.trim()} onChange={() => {}} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-3xl">Billing address</h2>
        <p className="mt-1 text-sm text-ink-soft">Select the address that matches your payment method.</p>
        <div className="mt-4 overflow-hidden border edge">
          <div className="flex items-center gap-3 border-b edge bg-[var(--color-tile)]/70 px-5 py-4">
            <RadioDot active />
            <span className="font-semibold">Same as shipping address</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-4 text-ink-soft">
            <RadioDot active={false} />
            <span>Use a different billing address</span>
          </div>
        </div>
      </section>

      <StepActions onBack={onBack} backLabel="Return to shipping" onContinue={onPay} continueLabel="Pay now" />
    </div>
  );
}

function OrderSummary({
  lines,
  subtotal,
  shippingCost,
  campaignDiscount,
  codeDiscount,
  total,
  discountCode,
  onDiscountCode,
  onApplyDiscount,
  count,
}: {
  lines: CartLine[];
  subtotal: number;
  shippingCost: number;
  campaignDiscount: number;
  codeDiscount: number;
  total: number;
  discountCode: string;
  onDiscountCode: (value: string) => void;
  onApplyDiscount: () => void;
  count: number;
}) {
  return (
    <aside className="border-t edge bg-[var(--color-tile)]/30 px-5 py-8 md:px-10 lg:border-l lg:border-t-0 lg:px-8 lg:py-14">
      <div className="lg:sticky lg:top-24">
        <div className="space-y-5">
          {lines.map((line) => {
            const product = productById(line.id);
            return (
              <div key={line.key} className="grid grid-cols-[64px_1fr_auto] items-center gap-4">
                <div className="relative h-16 w-16 border edge bg-[var(--color-tile)]">
                  <div className="h-full w-full overflow-hidden">
                    {product && <ProductImage item={product} index={1} className="h-full w-full object-cover object-top" />}
                  </div>
                  <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] leading-none text-white">
                    {line.qty}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{line.name}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {[line.colorName, line.size].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{vnd(line.price * line.qty)}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto] gap-3">
          <Field placeholder="Discount code or gift card" value={discountCode} onChange={onDiscountCode} />
          <button onClick={onApplyDiscount} className="border edge px-5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink">
            Apply
          </button>
        </div>

        <div className="mt-7 space-y-3 text-sm">
          <SummaryRow label={`Subtotal · ${count} item${count === 1 ? "" : "s"}`} value={vnd(subtotal)} />
          {campaignDiscount > 0 && <SummaryRow label="Campaign discount" value={`-${vnd(campaignDiscount)}`} accent />}
          {codeDiscount > 0 && <SummaryRow label="Code discount" value={`-${vnd(codeDiscount)}`} accent />}
          <SummaryRow label="Shipping" value={shippingCost === 0 ? "Free" : vnd(shippingCost)} />
          <div className="flex items-end justify-between border-t edge pt-5">
            <span className="font-serif text-3xl">Total</span>
            <span className="flex items-baseline gap-2">
              <span className="text-xs uppercase text-ink-soft">VND</span>
              <span className="text-2xl font-semibold tabular-nums">{vnd(total)}</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ReviewRows({
  form,
  onEdit,
}: {
  form: ReturnType<typeof defaultForm>;
  onEdit: () => void;
}) {
  const shipTo = [
    `${form.firstName} ${form.lastName}`.trim(),
    form.address,
    form.apartment,
    form.city,
    form.postalCode,
    form.country,
  ].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden border edge text-sm">
      <div className="grid grid-cols-[90px_1fr_auto] gap-4 border-b edge px-5 py-4">
        <span className="text-ink-soft">Contact</span>
        <span className="font-semibold">{form.email || "No email yet"}</span>
        <button onClick={onEdit} className="link-underline text-ink-soft transition-colors hover:text-ink">Change</button>
      </div>
      <div className="grid grid-cols-[90px_1fr_auto] gap-4 px-5 py-4">
        <span className="text-ink-soft">Ship to</span>
        <span className="font-semibold">{shipTo || "No address yet"}</span>
        <button onClick={onEdit} className="link-underline text-ink-soft transition-colors hover:text-ink">Change</button>
      </div>
    </div>
  );
}

function StepActions({
  backTo,
  backLabel,
  onBack,
  onContinue,
  continueLabel,
}: {
  backTo?: string;
  backLabel: string;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  const back = backTo ? (
    <Link to={backTo} className="link-underline text-sm text-ink-soft transition-colors hover:text-ink">‹ {backLabel}</Link>
  ) : (
    <button onClick={onBack} className="link-underline text-sm text-ink-soft transition-colors hover:text-ink">‹ {backLabel}</button>
  );
  return (
    <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {back}
      <button
        onClick={onContinue}
        className="flex h-[52px] min-w-[220px] items-center justify-center rounded bg-ink px-8 text-[11px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
      >
        {continueLabel}
      </button>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-14 w-full border edge bg-[var(--color-bg)] px-4 text-sm outline-none transition-colors placeholder:text-ink-soft/80 focus:border-ink ${className}`}
    />
  );
}

function ExpressButton({
  logo,
  label,
  onClick,
}: {
  logo?: { src: string; alt: string };
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 items-center justify-center rounded-full border edge bg-[var(--color-bg)] px-8 transition-colors hover:border-ink hover:bg-white/50"
    >
      {logo ? (
        <img src={logo.src} alt={logo.alt} className="h-6 max-w-[92px] object-contain" />
      ) : (
        <span className="text-sm font-semibold tracking-[0.02em]">{label}</span>
      )}
    </button>
  );
}

function PaymentLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="flex h-8 min-w-12 items-center justify-center border edge bg-[var(--color-bg)] px-2">
      <img src={src} alt={alt} className="h-5 max-w-14 object-contain" />
    </span>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-8 grid grid-cols-[1fr_auto_1fr] items-center gap-5 text-sm text-ink-soft">
      <span className="h-px bg-[var(--color-line)]" />
      <span>{label}</span>
      <span className="h-px bg-[var(--color-line)]" />
    </div>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-ink bg-ink" : "border-ink-soft bg-[var(--color-bg)]"}`}>
      {active && <span className="h-2 w-2 rounded-full bg-[var(--color-bg)]" />}
    </span>
  );
}

function SummaryRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${accent ? "text-[var(--color-positive)]" : ""}`}>
      <span className="text-ink-soft">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function EmptyCart() {
  const navigate = useNavigate();
  return (
    <div className="mt-16 border edge px-8 py-16 text-center">
      <h1 className="font-serif text-4xl">Your cart is empty.</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-ink-soft">
        Add a piece before starting checkout.
      </p>
      <button
        onClick={() => navigate("/shop")}
        className="mt-8 rounded-full bg-ink px-8 py-3 text-sm text-white"
      >
        Shop all
      </button>
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
