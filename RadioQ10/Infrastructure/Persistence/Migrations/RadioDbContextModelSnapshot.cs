using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using RadioQ10.Infrastructure.Persistence;

#nullable disable

namespace RadioQ10.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(RadioDbContext))]
    partial class RadioDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "9.0.0-rc.2.24474.1");

            modelBuilder.Entity("RadioQ10.Domain.Entities.RadioUser", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedNever()
                    .HasColumnType("uuid");

                b.Property<DateTimeOffset>("CreatedAt")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("IpAddress")
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnType("character varying(64)");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnType("character varying(64)");

                b.HasKey("Id");

                b.HasIndex("IpAddress", "Name")
                    .IsUnique();

                b.ToTable("radio_users", (string)null);
            });

            modelBuilder.Entity("RadioQ10.Domain.Entities.SongQueueItem", b =>
            {
                b.Property<Guid>("Id")
                    .ValueGeneratedNever()
                    .HasColumnType("uuid");

                b.Property<string>("ChannelTitle")
                    .HasMaxLength(128)
                    .HasColumnType("character varying(128)");

                b.Property<DateTimeOffset>("EnqueuedAt")
                    .HasColumnType("timestamp with time zone");

                b.Property<string>("RequestedBy")
                    .HasMaxLength(64)
                    .HasColumnType("character varying(64)");

                b.Property<Guid?>("RequestedByUserId")
                    .HasColumnType("uuid");

                b.Property<string>("ThumbnailUrl")
                    .HasMaxLength(512)
                    .HasColumnType("character varying(512)");

                b.Property<string>("Title")
                    .IsRequired()
                    .HasMaxLength(256)
                    .HasColumnType("character varying(256)");

                b.Property<string>("VideoId")
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnType("character varying(64)");

                b.HasKey("Id");

                b.HasIndex("RequestedByUserId");

                b.ToTable("song_queue", (string)null);
            });

            modelBuilder.Entity("RadioQ10.Domain.Entities.SongQueueItem", b =>
            {
                b.HasOne("RadioQ10.Domain.Entities.RadioUser", "RequestedByUser")
                    .WithMany("RequestedSongs")
                    .HasForeignKey("RequestedByUserId")
                    .OnDelete(DeleteBehavior.SetNull);

                b.Navigation("RequestedByUser");
            });

            modelBuilder.Entity("RadioQ10.Domain.Entities.RadioUser", b =>
            {
                b.Navigation("RequestedSongs");
            });
#pragma warning restore 612, 618
        }
    }
}
