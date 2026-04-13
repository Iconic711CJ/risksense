import { useEffect, useState } from "react";
import { Building2, Loader2, ArrowRight, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import { getDepartments } from "../../services/api";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

export default function AdminDepts() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDepartments().then(setDepartments).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#064E3B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-[#064E3B]" />
          <h1 className="text-xl font-black text-slate-900">Departments</h1>
        </div>
        <p className="text-sm text-slate-400">{departments.length} departments</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => {
          const riskRate = d.total_risks > 0
            ? Math.round((d.resolved_count / d.total_risks) * 100)
            : 0;
          const hasCritical = (d.critical_count ?? 0) > 0;

          return (
            <Card key={d.id} className="hover:border-[#064E3B]/30 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-[#064E3B]">{d.code}</span>
                    </div>
                    <div>
                      <CardTitle>{d.name}</CardTitle>
                      <p className="text-[10px] text-slate-400 mt-0.5">{d.total_risks} total risks</p>
                    </div>
                  </div>
                  {hasCritical && (
                    <Badge variant="critical" className="text-[10px]">
                      {d.critical_count} critical
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-base font-black text-slate-800">{d.total_risks ?? 0}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                  </div>
                  <div className={`text-center p-2 rounded-xl border ${hasCritical ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                    <p className={`text-base font-black ${hasCritical ? "text-red-600" : "text-slate-400"}`}>{d.critical_count ?? 0}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${hasCritical ? "text-red-400" : "text-slate-400"}`}>Critical</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-base font-black text-emerald-600">{d.resolved_count ?? 0}</p>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Resolved</p>
                  </div>
                </div>

                {/* Resolution bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolution rate
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">{riskRate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#064E3B] rounded-full transition-all duration-500"
                      style={{ width: `${riskRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="w-full text-[#064E3B] border-emerald-200 hover:bg-emerald-50 hover:border-[#064E3B] group" asChild>
                  <Link to={`/admin/risks?dept=${d.id}`}>
                    View Risks
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {departments.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No departments configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
