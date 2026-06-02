import Image from "next/image";
import Link from "next/link";

interface GameCardProps {
  id: number;
  slug?: string;
  title: string;
  image: string;
  tags: string;
  description?: string;
}

export function GameCard({ id, slug, title, image, tags, description }: GameCardProps) {
  const tagList = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 2);

  const href = `/games/${slug ?? id}`;

  return (
    <Link href={href} className="group block">
      <article className="game-card overflow-hidden rounded-xl">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={image}
            alt={title}
            width={512}
            height={384}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
        </div>

        <div className="space-y-2 p-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-white sm:text-base">{title}</h3>
          {description ? (
            <p className="line-clamp-2 text-xs text-slate-300 sm:text-sm">{description}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <span key={tag} className="game-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}
