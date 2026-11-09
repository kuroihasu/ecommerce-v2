"use client";

import Image from "next/image";
import { useState } from "react";
import { canOptimize, photoUrl } from "./images";

// Imagen con respaldo: si la foto no carga queda un campo de color de la marca con
// el nombre, nunca un ícono roto. Con `hover`, al pasar el mouse sobre el grupo
// (`.group`) aparece la segunda foto, como en las fichas de tiendas de ropa.
export function Photo({
  name,
  hover,
  alt,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
  className = "",
}: {
  name: string;
  hover?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      {failed ? (
        <span className="absolute inset-0 flex items-end p-4 text-sm text-ink/60">{alt}</span>
      ) : (
        <>
          <Image
            src={photoUrl(name)}
            unoptimized={!canOptimize(photoUrl(name))}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            onError={() => setFailed(true)}
            className="object-cover"
          />
          {hover && hover !== name && (
            <Image
              src={photoUrl(hover)}
              unoptimized={!canOptimize(photoUrl(hover))}
              alt=""
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </>
      )}
    </div>
  );
}
