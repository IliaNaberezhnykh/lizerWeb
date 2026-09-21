import { CheckoutWizard } from "@/components/checkout/CheckoutWizard";
import { Footer, Header } from "@/components/site/Chrome";

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="page">
        <CheckoutWizard />
      </main>
      <Footer />
    </>
  );
}
