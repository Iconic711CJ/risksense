import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldPlus, PenLine } from "lucide-react";
import { toast } from "sonner";
import RiskForm from "../components/risks/RiskForm";
import { createRisk, updateRisk, getRisks, getDepartments } from "../services/api";
import useAppStore from "../store/useAppStore";

export default function AddRisk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const isEdit = !!id;

  const [initial, setInitial] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRisk, setFetchingRisk] = useState(isEdit);

  useEffect(() => {
    if (isAdmin) {
      getDepartments().then(setDepartments).catch(() => {});
    }
    if (isEdit) {
      setFetchingRisk(true);
      getRisks({ page_size: 200 })
        .then((res) => {
          const found = (res.risks || []).find((r) => r.id === id);
          if (found) setInitial(found);
          else toast.error("Risk not found");
        })
        .catch(() => toast.error("Failed to load risk"))
        .finally(() => setFetchingRisk(false));
    }
  }, [id, isEdit, isAdmin]);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      if (isEdit) {
        await updateRisk(id, data);
        toast.success("Risk updated successfully");
      } else {
        const risk = await createRisk(data);
        toast.success(`Risk ${risk.risk_code} logged successfully`);
      }
      navigate(-1);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to save risk";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (fetchingRisk) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="glass rounded-2xl border border-border p-6 md:p-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            {isEdit
              ? <PenLine className="w-5 h-5 text-primary" />
              : <ShieldPlus className="w-5 h-5 text-primary" />
            }
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              {isEdit ? "Edit Risk" : "Log New Risk"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? `Updating ${initial?.risk_code || "risk"}`
                : isAdmin ? "Log a risk for any department" : `Logging for ${user?.department_name}`
              }
            </p>
          </div>
        </div>

        <RiskForm
          initial={isEdit ? initial : null}
          departments={departments}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  );
}
