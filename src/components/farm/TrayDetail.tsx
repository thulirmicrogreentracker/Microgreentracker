import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Droplets,
  Leaf,
  MapPin,
  NotebookPen,
  X,
} from "lucide-react";
import { AppConfig, Batch, Tray } from "../../types";
import { STAGE_ORDER, stageConfig } from "../../data/stages";
import { locationLabel } from "../../utils/farmLayout";
import { batchCode } from "../../utils/batches";
import {
  formatDate,
  getDaysFromNow,
  getDaysSince,
} from "../../utils/dateUtils";
import PhotoImage from "../photos/PhotoImage";
import TrayArt from "./TrayArt";
export default function TrayDetail({
  batch,
  tray,
  config,
  onClose,
  onBatch,
  onWater,
  onPhoto,
  onNote,
  onLoss,
}: {
  batch: Batch;
  tray: Tray;
  config: AppConfig;
  onClose: () => void;
  onBatch: () => void;
  onWater: () => void;
  onPhoto: () => void;
  onNote: () => void;
  onLoss: () => void;
}) {
  const stage = tray.status === "lost" ? "lost" : batch.stage;
  const photo = batch.photos.filter((p) => p.trayId === tray.id).slice(-1)[0];
  const days = getDaysFromNow(batch.expectedHarvestDate);
  return (
    <div className="farm-stack">
      <div className="tray-detail-heading">
        <button
          className="farm-icon-button"
          onClick={onClose}
          aria-label="Back to shelves"
        >
          <ArrowLeft />
        </button>
        <h1>Tray {tray.code}</h1>
        <button
          className="farm-icon-button"
          onClick={onPhoto}
          aria-label="Add tray photo"
        >
          <Camera />
        </button>
      </div>
      <div className="tray-hero">
        {photo ? (
          <PhotoImage
            name={photo.file}
            size="full"
            alt={`${batch.cropType} tray ${tray.code}`}
            className="tray-hero-photo"
          />
        ) : (
          <>
            <TrayArt stage={stage} large />
            <span>Illustrative crop view · add your tray photo</span>
          </>
        )}
      </div>
      <div className="section-heading">
        <h2>{batch.cropType}</h2>
        <span className={`stage-badge stage-${stage}`}>
          {stage === "lost" ? "Lost" : stageConfig[stage].label}
        </span>
      </div>
      <p className="location-line">
        <MapPin size={15} />
        {locationLabel(tray.slot, config)}
        {batch.stage === "completed" || tray.status === "lost"
          ? " · previous location"
          : ""}
      </p>
      <div className="farm-metrics">
        <div>
          <span className="metric-icon">
            <CalendarDays />
          </span>
          <div>
            <strong>Day {getDaysSince(batch.sowingDate)}</strong>
            <span>Since sowing</span>
          </div>
        </div>
        <div>
          <span className="metric-icon">
            <Leaf />
          </span>
          <div>
            <strong>
              {batch.stage === "completed"
                ? "Harvested"
                : days < 0
                  ? `${-days}d overdue`
                  : days === 0
                    ? "Today"
                    : `${days} days`}
            </strong>
            <span>
              {batch.stage === "completed"
                ? `${tray.harvestWeight ?? "—"} g`
                : "Expected harvest"}
            </span>
          </div>
        </div>
      </div>
      {stage === "lost" ? (
        <section className="farm-surface loss-detail">
          <h2>Loss recorded</h2>
          <p>{tray.lostReason}</p>
          <p>{tray.lostDate && formatDate(tray.lostDate)}</p>
          <p>{tray.lostNote}</p>
        </section>
      ) : (
        <section className="farm-surface">
          <h2>Batch progress</h2>
          <p className="farm-help">
            Growth stage is shared by all active trays in this batch.
          </p>
          <ol className="growth-timeline">
            {STAGE_ORDER.map((s, i) => (
              <li
                key={s}
                className={
                  i <= STAGE_ORDER.indexOf(batch.stage) ? "reached" : ""
                }
              >
                <span>
                  {i < STAGE_ORDER.indexOf(batch.stage) ? (
                    <Check size={13} />
                  ) : (
                    <i />
                  )}
                </span>
                <b>{stageConfig[s].label}</b>
                <small>
                  {s === batch.stage
                    ? "Current"
                    : s === "sowing"
                      ? formatDate(batch.sowingDate)
                      : ""}
                </small>
              </li>
            ))}
          </ol>
        </section>
      )}
      <button className="batch-link" onClick={onBatch}>
        <span>
          <small>BELONGS TO</small>
          <b>
            {batchCode(batch.batchNumber)} · {batch.cropType}
          </b>
        </span>
        <ChevronRight />
      </button>
      <div className="tray-actions">
        <button onClick={onWater}>
          <Droplets />
          Water batch
        </button>
        <button onClick={onNote}>
          <NotebookPen />
          Batch note
        </button>
        <button onClick={onPhoto}>
          <Camera />
          Tray photo
        </button>
      </div>
      <section className="farm-surface">
        <h2>Growing details</h2>
        <dl className="detail-grid">
          <div>
            <dt>Seed / tray</dt>
            <dd>{batch.seedWeightPerTray ?? "—"} g</dd>
          </div>
          <div>
            <dt>Sown</dt>
            <dd>{formatDate(batch.sowingDate)}</dd>
          </div>
          <div>
            <dt>Last watering</dt>
            <dd>
              {batch.watering.length
                ? formatDate(batch.watering.slice(-1)[0]!.timestamp)
                : "Not recorded"}
            </dd>
          </div>
          <div>
            <dt>Harvest weight</dt>
            <dd>{tray.harvestWeight ?? "—"} g</dd>
          </div>
        </dl>
      </section>
      {batch.notes.length > 0 && (
        <section className="farm-surface">
          <h2>Recent batch notes</h2>
          {batch.notes
            .slice(-3)
            .reverse()
            .map((n) => (
              <p className="history-note" key={n.id}>
                {n.content}
                <small>{formatDate(n.timestamp)}</small>
              </p>
            ))}
        </section>
      )}
      <button className="farm-primary" onClick={onBatch}>
        Manage batch & harvest <ChevronRight size={18} />
      </button>
      {tray.status !== "lost" && batch.stage !== "completed" && (
        <button className="farm-danger" onClick={onLoss}>
          <X size={17} /> Mark this tray as lost
        </button>
      )}
    </div>
  );
}
