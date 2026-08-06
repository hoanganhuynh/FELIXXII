import { useTranslation } from "react-i18next";
import { listSources, upsertSource, deleteSource } from "../api/taxonomy";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import TaxonomyList from "../components/TaxonomyList";

export default function AdminSources() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const sources = useAsync(() => listSources(), [], []);

  return (
    <TaxonomyList
      title={t("sourcesPage.title")}
      subtitle={t("sourcesPage.subtitle")}
      rows={sources.data}
      loading={sources.loading}
      readOnly={ready && !isAdmin}
      newLabel={t("sourcesPage.new")}
      onSave={async (row, isNew) => {
        await upsertSource(row);
        sources.reload();
        void isNew;
      }}
      onDelete={async (row) => {
        await deleteSource(row.id);
        sources.reload();
      }}
    />
  );
}
