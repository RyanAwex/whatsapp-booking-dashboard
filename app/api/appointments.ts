import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    const { businessId, clientId, serviceId, staffId, startTime, endTime } =
      req.body;

    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          business_id: businessId,
          client_id: clientId,
          service_id: serviceId,
          staff_id: staffId,
          start_time: startTime,
          end_time: endTime,
        },
      ]);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
  }
}
