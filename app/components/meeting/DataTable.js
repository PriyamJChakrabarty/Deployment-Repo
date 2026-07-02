"use client";
import {
  AlertTriangle,
  User,
  Calendar,
  Shield,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function DataTable({ title, data, mappedClauses }) {
  if (!data || data.length === 0) return null;

  const getRiskStyle = (riskLevel) => {
    const level = (riskLevel || "").toLowerCase();

    if (level.includes("high") || level.includes("critical")) {
      return {
        badge: "bg-red-100 text-red-700 border border-red-300",
        card: "border-l-4 border-l-red-500 bg-white hover:bg-red-50",
      };
    } else if (level.includes("medium") || level.includes("warning")) {
      return {
        badge: "bg-amber-100 text-amber-700 border border-amber-300",
        card: "border-l-4 border-l-amber-500 bg-white hover:bg-amber-50",
      };
    } else if (level.includes("low")) {
      return {
        badge: "bg-emerald-100 text-emerald-700 border border-emerald-300",
        card: "border-l-4 border-l-emerald-500 bg-white hover:bg-emerald-50",
      };
    }

    return {
      badge: "bg-gray-100 text-gray-700 border border-gray-300",
      card: "border-l-4 border-l-gray-500 bg-white hover:bg-gray-50",
    };
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        </div>
        <span className="text-sm text-gray-600 font-medium">
          {data.length} item{data.length !== 1 ? "s" : ""} found
        </span>
      </div>

      <div className="space-y-4">
        {data.map((item, idx) => {
          // Get all fields from multiple possible field names
          const riskLevel =
            item["Risk Level"] || item.RiskLevel || item.risk_level || "";
          const clauseText =
            item.Clause || item.clause || item.Action || item.action || "";
          const description = item.Description || item.description || "";
          const responsiblePerson =
            item["Responsible Person"] ||
            item.ResponsiblePerson ||
            item.responsible ||
            item.responsible_person ||
            "";
          const deadline = item.Deadline || item.deadline || "";

          const styles = getRiskStyle(riskLevel);

          return (
            <div
              key={idx}
              className={`${styles.card} rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-200`}
            >
              {/* Top Row: Risk Level Badge */}
              <div className="flex items-center justify-between mb-5">
                {riskLevel && (
                  <span
                    className={`${styles.badge} px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide`}
                  >
                    {riskLevel}
                  </span>
                )}
              </div>

              {/* Main Content Grid */}
              <div className="space-y-4">
                {/* Clause or Action */}
                {clauseText && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {item.Action || item.action ? "Action" : "Clause"}
                      </h5>
                    </div>
                    <p className="text-base font-semibold text-gray-900 pl-6">
                      {clauseText}
                    </p>
                  </div>
                )}

                {/* Description */}
                {description && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Description
                      </h5>
                    </div>
                    <p className="text-sm text-gray-700 pl-6 leading-relaxed">
                      {description}
                    </p>
                  </div>
                )}

                {/* Bottom Grid: Responsible Person & Deadline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                  {/* Responsible Person */}
                  {responsiblePerson && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Responsible Person
                        </h5>
                      </div>
                      <p className="text-sm font-semibold text-indigo-700 pl-6">
                        {responsiblePerson}
                      </p>
                    </div>
                  )}

                  {/* Deadline */}
                  {deadline && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Deadline
                        </h5>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 pl-6">
                        {deadline}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Clauses */}
              {mappedClauses &&
                mappedClauses[idx] &&
                mappedClauses[idx].length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Related Clauses
                      </h5>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {mappedClauses[idx].slice(0, 4).map((clause, i) => (
                        <span
                          key={i}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200 font-medium"
                        >
                          {clause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
