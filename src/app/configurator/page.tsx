import { Header } from "@/components/site/Chrome";
import { ConfiguratorStudio } from "@/components/configurator/ConfiguratorStudio";

export default function ConfiguratorPage() {
  return (
    <>
      <Header />
      <main className="studio-page">
        <ConfiguratorStudio />
      </main>
    </>
  );
}
