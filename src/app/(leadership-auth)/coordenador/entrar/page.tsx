import { redirect } from "next/navigation";

// Login único (Victor 2026-06-23). A entrada do coordenador foi consolidada na
// entrada única em "/": quem coordena um polo entra com o MESMO telefone+OTP do
// colaborador — o JWT já traz a role `coordinator`, e o seletor de contexto no
// shell libera a área de coordenação. Mantido como redirect pra não quebrar
// links/bookmarks antigos. (LeadershipCheckFlow e /api/leadership/auth/* já foram
// removidos; este redirect é o que sobra da entrada separada do coordenador.)
// Dinâmica pela mesma razão da entrada: prerender estático sai com s-maxage de
// 1 ano e caches compartilhados seguram HTML velho entre deploys.
export const dynamic = "force-dynamic";

export default function LeadershipEntryRedirect() {
  redirect("/");
}
