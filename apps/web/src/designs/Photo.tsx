"use client";

import Image from "next/image";
import { useState } from "react";
import { photoUrl } from "./images";

// Imagen con respaldo: si la foto no carga, queda un campo de color de la marca
// con el nombre del producto, nunca un ícono roto.
export function Photo({
  name,
  alt,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
  className = "",
}: {
  name: string;
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
        <Image
          src={photoUrl(name)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
    </div>
  );
}
