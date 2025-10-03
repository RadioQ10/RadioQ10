using Microsoft.EntityFrameworkCore;
using RadioQ10.Models;

namespace RadioQ10.Data;

public sealed class RadioDbContext : DbContext, IRadioDbContext
{
    public RadioDbContext(DbContextOptions<RadioDbContext> options) : base(options)
    {
    }
    public DbSet<SongQueueItem> SongQueue => Set<SongQueueItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SongQueueItem>(entity =>
        {
            entity.ToTable("song_queue");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .ValueGeneratedNever();

            entity.Property(e => e.VideoId)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(e => e.Title)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(e => e.ChannelTitle)
                .HasMaxLength(128);

            entity.Property(e => e.ThumbnailUrl)
                .HasMaxLength(512);

            entity.Property(e => e.RequestedBy)
                .HasMaxLength(64);

            entity.Property(e => e.EnqueuedAt)
                .IsRequired();
        });
    }
}

