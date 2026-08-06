import { useTranslation } from "react-i18next";
import { listCategoriesTaxonomy, upsertCategory, deleteCategory } from "../api/taxonomy";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import TaxonomyList from "../components/TaxonomyList";

export default function AdminCategories() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const cats = useAsync(() => listCategoriesTaxonomy(), [], []);

  return (
    <TaxonomyList
      title={t("categoriesPage.title")}
      subtitle={t("categoriesPage.subtitle")}
      rows={cats.data}
      loading={cats.loading}
      readOnly={ready && !isAdmin}
      newLabel={t("categoriesPage.new")}
      onSave={async (row, isNew) => {
        await upsertCategory(row);
        cats.reload();
        void isNew;
      }}
      onDelete={async (row) => {
        await deleteCategory(row.id);
        cats.reload();
      }}
    />
  );
}
