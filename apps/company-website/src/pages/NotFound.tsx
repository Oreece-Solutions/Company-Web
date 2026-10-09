import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Layout, usePageMeta } from "../site/Layout";

const NotFound = () => {
  usePageMeta("Page not found", "The page you are looking for could not be found.");
  return (
    <Layout>
      <section className="wrap py-32 text-center">
        <p className="font-display text-sm font-semibold text-[hsl(var(--brand-red))]">404</p>
        <h1 className="h-section mt-4">We couldn’t find that page.</h1>
        <p className="lede mx-auto mt-4 max-w-xl">It may have moved as part of our new website.</p>
        <Link to="/" className="btn-dark mt-10">
          Back to home <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </Layout>
  );
};

export default NotFound;
