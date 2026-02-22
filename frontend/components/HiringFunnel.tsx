"use client";

import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

export default function HiringFunnel({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="card h-80">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" fill="#1b4332" stroke="none" dataKey="name" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
