using Microsoft.EntityFrameworkCore;
using RadioQ10.Domain.Entities;

namespace RadioQ10.Infrastructure.Persistence;

public sealed class RadioDbContext : DbContext, IRadioDbContext
{
    public RadioDbContext(DbContextOptions<RadioDbContext> options) : base(options)
    {
    }
    public DbSet<SongQueueItem> SongQueue => Set<SongQueueItem>();

    public DbSet<RadioUser> Users => Set<RadioUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RadioUser>(entity =>
        {
            entity.ToTable("radio_users");

            entity.HasKey(e => e.Id);

            entity.HasIndex(e => new { e.IpAddress, e.Name })
                .IsUnique();

            entity.Property(e => e.Id)
                .ValueGeneratedNever();

            entity.Property(e => e.Name)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(e => e.IpAddress)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();
        });

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

            entity.Property(e => e.RequestedByUserId);

            entity.HasOne(e => e.RequestedByUser)
                .WithMany(u => u.RequestedSongs)
                .HasForeignKey(e => e.RequestedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.Property(e => e.EnqueuedAt)
                .IsRequired();
        });
    }
}

