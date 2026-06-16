import React from 'react';
import { motion } from 'motion/react';
import { Mail, MessageCircle, ExternalLink } from 'lucide-react';

export default function AdvertiseWidget() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b5c06] via-[#0d6b07] to-[#084a04] p-5 shadow-xl cinematic-glow group border border-primary/20"
    >
      {/* Decorative Elements */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-400/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
      
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5">
            <span className="px-2.5 py-0.5 bg-yellow-400/20 backdrop-blur-md rounded-full text-[8px] font-black text-yellow-500 uppercase tracking-widest border border-yellow-500/20">
              فرصة إعلانية
            </span>
          </div>
          <h2 className="text-xl font-black text-white leading-tight">
            إعلانك <br /> 
            <span className="text-yellow-400">هنا</span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <a 
            href="mailto:info@almasrysc.tv" 
            className="h-10 px-5 bg-white text-primary-dark rounded-xl text-[10px] font-black shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-95 hover:scale-105 active:scale-95 transition-all group/btn"
          >
            <Mail size={12} />
            تواصل بريدياً
          </a>
          <a 
            href="https://wa.me/201278974053" 
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-5 bg-[#25D366] text-white rounded-xl text-[10px] font-black shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-95 hover:scale-105 active:scale-95 transition-all"
          >
            <MessageCircle size={12} />
            واتساب مباشر
          </a>
        </div>
      </div>


    </motion.div>
  );
}
