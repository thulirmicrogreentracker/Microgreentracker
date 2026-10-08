import { Batch } from '../../types';

/** Illustrative stage artwork, never presented as a photo of the user's crop. */
export default function TrayArt({
  stage = 'growth',
  empty = false,
  large = false,
}: {
  stage?: Batch['stage'] | 'lost';
  empty?: boolean;
  large?: boolean;
}) {
  const leafy = !empty && (stage === 'growth' || stage === 'harvest');
  return (
    <div
      aria-hidden="true"
      className={`tray-art ${large ? 'tray-art-large' : ''} stage-${stage} ${empty ? 'tray-art-empty' : ''}`}
    >
      {leafy ? (
        <img src="/images/microgreen-tray.webp" alt="" draggable={false} />
      ) : (
        <div className="illustrated-tray">
          <div className="tray-soil">
            {!empty &&
              Array.from({ length: 21 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${7 + (i % 7) * 14}%`,
                    top: `${20 + Math.floor(i / 7) * 25}%`,
                  }}
                />
              ))}
          </div>
          <div className="tray-front" />
          {stage === 'germination' && !empty && <div className="tray-dome" />}
        </div>
      )}
    </div>
  );
}
