import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldPlus, PenLine } from "lucide-react";
import { toast } from "sonner";
import RiskForm from "../../components/risks/RiskForm";
import { createRisk, updateRisk, getRisks, getDepartments } from "../../services/api";

export default function AdminAddRisk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [initial, setInitial] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => {});
    if (!isEdit) return;
    setFetching(true);
    getRisks({ page_size: 200 })
      .then((res) => {
        const found = (res.risks || []).find((r) => r.id === id);
        if (found) setInitial(found);
        else toast.error("Risk not found");
      })
      .catch(() => toast.error("Failed to load risk"))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      if (isEdit) {
        await updateRisk(id, data);
        toast.success("Risk updated");
      } else {
        const risk = await createRisk(data);
        toast.success(`Risk ${risk.risk_code} logged`);
      }
      navigate("/admin/risks");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save risk");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-[#064E3B] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            {isEdit ? <PenLine className="w-5 h-5 text-[#064E3B]" /> : <ShieldPlus className="w-5 h-5 text-[#064E3B]" />}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">{isEdit ? "Edit Risk" : "Log a Risk"}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Updating ${initial?.risk_code ?? "risk"}` : "Log a risk for any department"}
            </p>
          </div>
        </div>
        <RiskForm initial={isEdit ? initial : null} departments={departments} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
