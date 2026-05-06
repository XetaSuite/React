import { type FC } from "react";
import { useTranslation } from "react-i18next";
import { FaShieldHalved } from "react-icons/fa6";
import { PageMeta } from "@/shared/components/common";
import ApiKeysSection from "@/features/Tokens/components/ApiKeysSection";

const SecurityPage: FC = () => {
    const { t } = useTranslation();

    return (
        <>
            <PageMeta title={t("account.security.pageTitle")} description={t("account.security.pageDescription")} />

            <div className="bg-white rounded-xl border border-gray-200 dark:bg-white/3 dark:border-white/5">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20">
                            <FaShieldHalved className="w-5 h-5 text-brand-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {t("account.security.pageTitle")}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("account.security.pageDescription")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    <ApiKeysSection />
                </div>
            </div>
        </>
    );
};

export default SecurityPage;
