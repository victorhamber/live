import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await db.page.findUnique({ where: { slug } });
  return { title: page?.videoTitle || page?.title || "Ao vivo" };
}

export default async function LivePage({ params }: Props) {
  const { slug } = await params;
  const page = await db.page.findUnique({
    where: { slug },
    include: { agent: true },
  });
  if (!page || page.status !== "published") notFound();

  const config = {
    slug: page.slug,
    viewersBase: page.viewersBase,
    mode: page.mode,
    agentName: page.agent?.name || "Suporte",
    agentAvatar: page.agent?.avatar || initials(page.agent?.name || "SP"),
  };

  return (
    <>
      <link rel="stylesheet" href="/live.css" />
      <div className="topbar">
        <a className="yt-logo" href="#">
          {page.brandName}
        </a>
        <div className="topbar-right">
          <div className="topbar-avatar">{page.channelAvatar || "AT"}</div>
        </div>
      </div>

      <div className="main-wrap">
        <div className="video-side">
          <div className="player-wrap">
            <div className="live-overlay">
              <div className="live-badge">Ao vivo</div>
              <div className="viewers-badge">
                <span className="viewers-dot" />
                <span id="viewer-count">{page.viewersBase.toLocaleString("pt-BR")}</span> assistindo agora
              </div>
            </div>
            {page.vturbPlayerId ? (
              <>
                <div
                  dangerouslySetInnerHTML={{
                    __html: `<vturb-smartplayer id="${page.vturbPlayerId}" style="display:block;margin:0 auto;width:100%;"></vturb-smartplayer>`,
                  }}
                />
                {page.vturbScriptUrl ? (
                  <script src={page.vturbScriptUrl} async />
                ) : null}
              </>
            ) : (
              <div className="player-fallback">Player não configurado</div>
            )}
          </div>

          <div className="video-info">
            <div className="video-title">{page.videoTitle || page.title}</div>
            <div className="channel-row">
              <div className="channel-avatar">{page.channelAvatar || "AT"}</div>
              <div>
                <div className="channel-name">{page.channelName || page.brandName}</div>
                <div className="channel-subs">{page.channelHandle || "Transmissão ao vivo"}</div>
              </div>
            </div>
            <div className="desc-box" id="desc-box">
              <div className="desc-meta">
                <strong id="desc-views-label">
                  {page.viewersBase.toLocaleString("pt-BR")} visualizações ao vivo
                </strong>
                <span>Há alguns momentos</span>
              </div>
              <div className="desc-text" id="desc-text">
                {page.description}
              </div>
              <div className="desc-toggle-btn" id="desc-toggle">
                Mostrar menos
              </div>
            </div>
          </div>
        </div>

        <div className="chat-side">
          <div className="chat-header">
            <span className="live-dot" />
            Chat ao vivo
            <span className="chat-viewers-count">
              (<span id="chat-viewers">{page.viewersBase.toLocaleString("pt-BR")}</span>)
            </span>
          </div>
          <div className="chat-messages" id="chat-messages" />
          <div className="chat-input-area">
            <div className="chat-input-row">
              <div className="chat-input-avatar" id="user-avatar">
                VC
              </div>
              <input
                type="text"
                className="chat-input"
                id="chat-input"
                placeholder="Envie uma mensagem..."
                maxLength={200}
              />
              <button className="send-btn" id="send-btn" type="button" aria-label="Enviar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <div className="chat-note">{page.chatNote}</div>
          </div>
        </div>
      </div>

      <div className="modal" id="identity-modal" hidden>
        <div className="modal-card">
          <h2>Entre no chat</h2>
          <p>Informe seu nome e e-mail para comentar.</p>
          <input id="identity-name" placeholder="Seu nome" />
          <input id="identity-email" type="email" placeholder="Seu e-mail" />
          <button type="button" id="identity-submit">
            Continuar
          </button>
        </div>
      </div>
      <div className="toast" id="toast" />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__LIVE__=${JSON.stringify(config)};`,
        }}
      />
      <script src="/live.js" defer />
    </>
  );
}
