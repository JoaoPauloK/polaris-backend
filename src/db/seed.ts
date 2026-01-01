import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { users, projects, photos, selections, selectedPhotos } from './schema.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Limpar dados existentes
    console.log('🧹 Cleaning existing data...');
    await db.delete(selectedPhotos);
    await db.delete(selections);
    await db.delete(photos);
    await db.delete(projects);
    await db.delete(users);

    // Criar usuários demo
    console.log('👥 Creating demo users...');
    const hashedPassword = await bcrypt.hash('demo123', 10);

    const [user1, user2, user3] = await db.insert(users).values([
      {
        name: 'Ana Silva',
        email: 'ana@exemplo.com',
        password: hashedPassword,
        phone: '+55 11 98765-4321',
        businessName: 'Ana Silva Fotografia',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
      },
      {
        name: 'Carlos Mendes',
        email: 'carlos@exemplo.com',
        password: hashedPassword,
        phone: '+55 21 99876-5432',
        businessName: 'Carlos Mendes Photos',
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
      },
      {
        name: 'Beatriz Costa',
        email: 'beatriz@exemplo.com',
        password: hashedPassword,
        phone: '+55 31 97654-3210',
        businessName: 'Beatriz Costa Studio',
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
      },
    ]).returning();

    console.log('✅ Users created');

    // Criar projetos
    console.log('📁 Creating demo projects...');
    const [project1, project2, project3, project4, project5] = await db.insert(projects).values([
      {
        userId: user1.id,
        name: 'Casamento Maria & João',
        description: 'Casamento no campo com 300 fotos tiradas. Pacote inclui 50 fotos editadas.',
        driveFolderUrl: 'https://drive.google.com/drive/folders/1ABC123XYZ',
        driveFolderId: '1ABC123XYZ',
        packagePhotosCount: 50,
        additionalPhotoPrice: '80.00',
        status: 'active',
        galleryStatus: 'open',
        galleryToken: uuidv4(),
      },
      {
        userId: user1.id,
        name: 'Ensaio Gestante - Laura',
        description: 'Ensaio gestante externo com 150 fotos. Pacote de 30 fotos.',
        driveFolderUrl: 'https://drive.google.com/drive/folders/2DEF456ABC',
        driveFolderId: '2DEF456ABC',
        packagePhotosCount: 30,
        additionalPhotoPrice: '60.00',
        status: 'active',
        galleryStatus: 'open',
        galleryToken: uuidv4(),
      },
      {
        userId: user2.id,
        name: '15 Anos Júlia',
        description: 'Festa de 15 anos com decoração tema Paris. Pacote de 40 fotos.',
        driveFolderUrl: 'https://drive.google.com/drive/folders/3GHI789DEF',
        driveFolderId: '3GHI789DEF',
        packagePhotosCount: 40,
        additionalPhotoPrice: '70.00',
        status: 'active',
        galleryStatus: 'open',
        galleryToken: uuidv4(),
      },
      {
        userId: user2.id,
        name: 'Corporativo - Empresa Tech',
        description: 'Fotos corporativas da equipe e escritório. Pacote 25 fotos.',
        driveFolderUrl: 'https://drive.google.com/drive/folders/4JKL012GHI',
        driveFolderId: '4JKL012GHI',
        packagePhotosCount: 25,
        additionalPhotoPrice: '100.00',
        status: 'active',
        galleryStatus: 'open',
        galleryToken: uuidv4(),
      },
      {
        userId: user3.id,
        name: 'Newborn - Pedro',
        description: 'Ensaio newborn em estúdio. Pacote de 20 fotos.',
        driveFolderUrl: 'https://drive.google.com/drive/folders/5MNO345JKL',
        driveFolderId: '5MNO345JKL',
        packagePhotosCount: 20,
        additionalPhotoPrice: '90.00',
        status: 'completed',
        galleryStatus: 'closed',
        galleryToken: uuidv4(),
      },
    ]).returning();

    console.log('✅ Projects created');

    // URLs de fotos demo do Unsplash (tema fotografia)
    const photoUrls = [
      'https://images.unsplash.com/photo-1519741497674-611481863552',
      'https://images.unsplash.com/photo-1606800052052-a08af7148866',
      'https://images.unsplash.com/photo-1591604466107-ec97de577aff',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a',
      'https://images.unsplash.com/photo-1460978812857-470ed1c77af0',
      'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8',
      'https://images.unsplash.com/photo-1496284427489-f59461d8a8e6',
      'https://images.unsplash.com/photo-1529636798458-92182e662485',
      'https://images.unsplash.com/photo-1525258409627-db3b5e6d92d0',
      'https://images.unsplash.com/photo-1502727054706-e4386ffa3ce7',
      'https://images.unsplash.com/photo-1535743333128-b64ed5b07a70',
    ];

    // Criar fotos para cada projeto
    console.log('📸 Creating demo photos...');
    const allProjects = [project1, project2, project3, project4, project5];
    
    for (const project of allProjects) {
      const photoCount = 15; // 15 fotos por projeto
      const projectPhotos = [];

      for (let i = 0; i < photoCount; i++) {
        projectPhotos.push({
          projectId: project.id,
          driveFileId: `file_${project.id}_${i}`,
          driveFileName: `photo_${String(i + 1).padStart(3, '0')}.jpg`,
          originalUrl: `${photoUrls[i % photoUrls.length]}?w=1920&h=1080&fit=crop`,
          thumbnailUrl: `${photoUrls[i % photoUrls.length]}?w=400&h=300&fit=crop`,
          watermarkedUrl: `${photoUrls[i % photoUrls.length]}?w=800&h=600&fit=crop`,
          width: 1920,
          height: 1080,
          sizeBytes: 2500000,
          position: i,
        });
      }

      await db.insert(photos).values(projectPhotos);
    }

    console.log('✅ Photos created');

    // Buscar algumas fotos para criar seleções
    const project1Photos = await db.query.photos.findMany({
      where: (photos, { eq }) => eq(photos.projectId, project1.id),
      limit: 10,
    });

    const project2Photos = await db.query.photos.findMany({
      where: (photos, { eq }) => eq(photos.projectId, project2.id),
      limit: 8,
    });

    const project3Photos = await db.query.photos.findMany({
      where: (photos, { eq }) => eq(photos.projectId, project3.id),
      limit: 12,
    });

    // Criar seleções
    console.log('✅ Creating demo selections...');
    const [selection1, selection2, selection3] = await db.insert(selections).values([
      {
        projectId: project1.id,
        clientName: 'Maria Santos',
        clientEmail: 'maria@exemplo.com',
        clientPhone: '+55 11 91234-5678',
        selectedPhotosCount: 55,
        additionalPhotosCount: 5,
        totalPrice: '400.00',
        notes: 'Adorei todas as fotos! Gostaria de adicionar mais 5.',
        status: 'confirmed',
      },
      {
        projectId: project2.id,
        clientName: 'Laura Oliveira',
        clientEmail: 'laura@exemplo.com',
        clientPhone: '+55 11 92345-6789',
        selectedPhotosCount: 32,
        additionalPhotosCount: 2,
        totalPrice: '120.00',
        notes: 'Ficaram lindas! Obrigada!',
        status: 'pending',
      },
      {
        projectId: project3.id,
        clientName: 'Júlia Ferreira',
        clientEmail: 'julia@exemplo.com',
        clientPhone: '+55 21 93456-7890',
        selectedPhotosCount: 45,
        additionalPhotosCount: 5,
        totalPrice: '350.00',
        notes: 'Perfeitas para o álbum!',
        status: 'confirmed',
      },
    ]).returning();

    console.log('✅ Selections created');

    // Adicionar fotos selecionadas
    console.log('🖼️  Creating selected photos...');
    
    if (project1Photos.length > 0) {
      await db.insert(selectedPhotos).values(
        project1Photos.map(photo => ({
          selectionId: selection1.id,
          photoId: photo.id,
        }))
      );
    }

    if (project2Photos.length > 0) {
      await db.insert(selectedPhotos).values(
        project2Photos.map(photo => ({
          selectionId: selection2.id,
          photoId: photo.id,
        }))
      );
    }

    if (project3Photos.length > 0) {
      await db.insert(selectedPhotos).values(
        project3Photos.map(photo => ({
          selectionId: selection3.id,
          photoId: photo.id,
        }))
      );
    }

    console.log('✅ Selected photos created');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📝 Demo credentials:');
    console.log('   Email: ana@exemplo.com');
    console.log('   Password: demo123\n');
    console.log('   Email: carlos@exemplo.com');
    console.log('   Password: demo123\n');
    console.log('   Email: beatriz@exemplo.com');
    console.log('   Password: demo123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
